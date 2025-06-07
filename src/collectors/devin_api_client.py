#!/usr/bin/env python3
"""
Devin API統合クライアント

Devin APIを使用してクレジット使用量とセッション統計を取得します。
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from ..utils.devin_api import make_devin_api_request, is_devin_api_available, load_config


class DevinAPIClient:
    """Devin API クライアント"""
    
    def __init__(self, config=None):
        self.config = config or load_config()
        self.devin_config = self.config["devin_api"]
        self.base_url = self.devin_config["base_url"]
    
    def get_enterprise_consumption(self, start_date: str, end_date: str) -> Dict:
        """
        企業のクレジット消費データを取得
        
        Args:
            start_date: 開始日 (YYYY-MM-DD)
            end_date: 終了日 (YYYY-MM-DD)
        
        Returns:
            消費データの辞書
        """
        if not is_devin_api_available():
            print("Devin APIが利用できません（トークンが設定されていない可能性があります）")
            return {}
        
        endpoint = self.devin_config["endpoints"]["consumption"]
        params = {
            "start_date": start_date,
            "end_date": end_date
        }
        
        try:
            return make_devin_api_request(endpoint, params)
        except Exception as e:
            print(f"クレジット消費データ取得エラー: {e}")
            return {}
    
    def list_sessions(self, limit: int = 100) -> List[Dict]:
        """
        セッション一覧を取得
        
        Args:
            limit: 取得件数の上限
        
        Returns:
            セッションのリスト
        """
        if not is_devin_api_available():
            print("Devin APIが利用できません")
            return []
        
        endpoint = self.devin_config["endpoints"]["sessions"]
        params = {"limit": limit}
        
        try:
            result = make_devin_api_request(endpoint, params)
            return result.get("sessions", [])
        except Exception as e:
            print(f"セッション取得エラー: {e}")
            return []
    
    def get_session_details(self, session_id: str) -> Dict:
        """
        特定のセッションの詳細を取得
        
        Args:
            session_id: セッションID
        
        Returns:
            セッション詳細の辞書
        """
        if not is_devin_api_available():
            return {}
        
        endpoint = f"{self.devin_config['endpoints']['sessions']}/{session_id}"
        
        try:
            return make_devin_api_request(endpoint)
        except Exception as e:
            print(f"セッション詳細取得エラー: {e}")
            return {}

    def analyze_pr_related_sessions(self, days_back: int = 30) -> Dict:
        """
        PR関連セッションを分析
        
        Args:
            days_back: 過去何日分を分析するか
        
        Returns:
            分析結果の辞書
        """
        if not is_devin_api_available():
            return {
                "api_available": False,
                "total_pr_sessions": 0,
                "daily_stats": {},
                "estimated_credits": 0
            }
        
        sessions = self.list_sessions(limit=1000)
        
        pr_related_sessions = []
        daily_stats = {}
        
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        for session in sessions:
            created_at = session.get("created_at")
            if created_at:
                try:
                    session_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    if session_date < cutoff_date:
                        continue
                except ValueError:
                    continue
            
            if self._is_pr_related_session(session):
                pr_related_sessions.append(session)
                
                date_key = session_date.date().isoformat()
                if date_key not in daily_stats:
                    daily_stats[date_key] = {
                        "pr_sessions": 0,
                        "estimated_credits": 0
                    }
                
                daily_stats[date_key]["pr_sessions"] += 1
                daily_stats[date_key]["estimated_credits"] += self._estimate_session_credits(session)
        
        return {
            "api_available": True,
            "total_pr_sessions": len(pr_related_sessions),
            "daily_stats": daily_stats,
            "estimated_credits": sum(self._estimate_session_credits(s) for s in pr_related_sessions)
        }

    def _is_pr_related_session(self, session: Dict) -> bool:
        """セッションがPR関連かどうかを判定"""
        pr_keywords = [
            "pull request", "pr", "プルリクエスト", "プルリク",
            "merge", "マージ", "github", "git"
        ]
        
        task_description = session.get("task_description", "").lower()
        for keyword in pr_keywords:
            if keyword in task_description:
                return True
        
        return False

    def _estimate_session_credits(self, session: Dict) -> int:
        """セッションのクレジット使用量を推定"""
        if "credits_used" in session:
            return session["credits_used"]
        
        duration = session.get("duration_minutes", 30)
        estimated_credits = max(10, duration * 2)
        return estimated_credits
