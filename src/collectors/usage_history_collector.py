#!/usr/bin/env python3
"""
Usage History収集モジュール

手動で提供されるDevin Usage Historyデータを処理します。
"""

import csv
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from ..utils.github_api import load_config


class UsageHistoryCollector:
    """Usage History収集クラス"""

    def __init__(self, config=None):
        """初期化"""
        self.config = config or load_config()
        self.usage_config = self.config.get("devin_usage", {})

    def load_usage_history_csv(self, file_path: str) -> List[Dict]:
        """CSVファイルからUsage Historyを読み込む"""
        usage_data = []
        
        if not os.path.exists(file_path):
            print(f"⚠️ Usage Historyファイルが見つかりません: {file_path}")
            return usage_data
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    session_data = {
                        "session_name": row.get("Session", "").strip(),
                        "created_at": row.get("Created At", "").strip(),
                        "acus_used": float(row.get("ACUs Used", 0)),
                        "date": self._parse_date(row.get("Created At", ""))
                    }
                    usage_data.append(session_data)
            
            print(f"✅ Usage History読み込み完了: {len(usage_data)}セッション")
            
        except Exception as e:
            print(f"❌ Usage History読み込みエラー: {e}")
        
        return usage_data

    def load_usage_history_json(self, file_path: str) -> List[Dict]:
        """JSONファイルからUsage Historyを読み込む"""
        usage_data = []
        
        if not os.path.exists(file_path):
            print(f"⚠️ Usage Historyファイルが見つかりません: {file_path}")
            return usage_data
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                if isinstance(data, list):
                    for item in data:
                        session_data = {
                            "session_name": item.get("session_name", ""),
                            "created_at": item.get("created_at", ""),
                            "acus_used": float(item.get("acus_used", 0)),
                            "date": self._parse_date(item.get("created_at", ""))
                        }
                        usage_data.append(session_data)
            
            print(f"✅ Usage History読み込み完了: {len(usage_data)}セッション")
            
        except Exception as e:
            print(f"❌ Usage History読み込みエラー: {e}")
        
        return usage_data

    def _parse_date(self, date_str: str) -> Optional[str]:
        """日付文字列を標準形式に変換"""
        if not date_str:
            return None
        
        try:
            date_obj = datetime.strptime(date_str, "%b %d, %Y")
            return date_obj.strftime("%Y-%m-%d")
        except ValueError:
            pass
        
        try:
            date_obj = datetime.strptime(date_str, "%B %d, %Y")
            return date_obj.strftime("%Y-%m-%d")
        except ValueError:
            pass
        
        try:
            date_obj = datetime.fromisoformat(date_str.replace("Z", ""))
            return date_obj.strftime("%Y-%m-%d")
        except ValueError:
            print(f"⚠️ 日付解析失敗: {date_str}")
            return None

    def analyze_pr_related_sessions(self, usage_data: List[Dict], devin_prs: List[Dict]) -> Dict:
        """PR関連セッションを特定・分析"""
        pr_keywords = [
            "pr", "pull request", "github", "merge", "commit", "review",
            "プルリクエスト", "マージ", "コミット", "レビュー"
        ]
        
        pr_sessions = []
        total_pr_acus = 0
        daily_usage = {}
        
        for session in usage_data:
            session_name = session["session_name"].lower()
            
            is_pr_related = any(keyword in session_name for keyword in pr_keywords)
            
            if is_pr_related:
                pr_sessions.append(session)
                total_pr_acus += session["acus_used"]
                
                date = session["date"]
                if date:
                    if date not in daily_usage:
                        daily_usage[date] = {"sessions": 0, "acus": 0}
                    daily_usage[date]["sessions"] += 1
                    daily_usage[date]["acus"] += session["acus_used"]
        
        total_prs = len(devin_prs)
        avg_acus_per_pr = total_pr_acus / total_prs if total_prs > 0 else 0
        
        return {
            "total_pr_sessions": len(pr_sessions),
            "total_pr_acus": total_pr_acus,
            "avg_acus_per_pr": avg_acus_per_pr,
            "daily_usage": daily_usage,
            "pr_sessions": pr_sessions
        }

    def generate_usage_summary(self, usage_data: List[Dict]) -> Dict:
        """Usage History全体のサマリーを生成"""
        if not usage_data:
            return {"error": "Usage Historyデータがありません"}
        
        total_sessions = len(usage_data)
        total_acus = sum(session["acus_used"] for session in usage_data)
        avg_acus_per_session = total_acus / total_sessions if total_sessions > 0 else 0
        
        daily_summary = {}
        for session in usage_data:
            date = session["date"]
            if date:
                if date not in daily_summary:
                    daily_summary[date] = {"sessions": 0, "acus": 0}
                daily_summary[date]["sessions"] += 1
                daily_summary[date]["acus"] += session["acus_used"]
        
        dates = [session["date"] for session in usage_data if session["date"]]
        period_start = min(dates) if dates else None
        period_end = max(dates) if dates else None
        
        return {
            "total_sessions": total_sessions,
            "total_acus": total_acus,
            "avg_acus_per_session": avg_acus_per_session,
            "period_start": period_start,
            "period_end": period_end,
            "daily_summary": daily_summary
        }

    def load_usage_data(self, file_path: Optional[str] = None) -> List[Dict]:
        """Usage Historyデータを読み込む（自動形式判定）"""
        if not file_path:
            file_path = self.usage_config.get("usage_history_file", "./data/usage_history.csv")
        
        if not os.path.exists(file_path):
            print(f"⚠️ Usage Historyファイルが見つかりません: {file_path}")
            print("手動でUsage Historyデータを提供してください")
            return []
        
        if file_path.endswith('.csv'):
            return self.load_usage_history_csv(file_path)
        elif file_path.endswith('.json'):
            return self.load_usage_history_json(file_path)
        else:
            print(f"❌ サポートされていないファイル形式: {file_path}")
            return []
