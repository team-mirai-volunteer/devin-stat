#!/usr/bin/env python3
"""
Devin統計分析モジュール

Devin作成PRの統計分析を行います。
"""

import json
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

from ..utils.github_api import load_config


class DevinStatsAnalyzer:
    """Devin統計分析クラス"""

    def __init__(self, config=None):
        """初期化"""
        self.config = config or load_config()
        self.analysis_config = self.config["analysis"]

    def analyze_daily_stats(self, devin_prs: List[Dict]) -> Dict:
        """日別統計を分析する"""
        daily_created = defaultdict(int)
        daily_merged = defaultdict(int)
        
        for pr in devin_prs:
            basic_info = pr.get("basic_info", {})
            
            created_at = basic_info.get("created_at")
            if created_at:
                created_date = datetime.fromisoformat(created_at.replace("Z", "")).date()
                daily_created[created_date.isoformat()] += 1
            
            merged_at = basic_info.get("merged_at")
            if merged_at:
                merged_date = datetime.fromisoformat(merged_at.replace("Z", "")).date()
                daily_merged[merged_date.isoformat()] += 1
        
        return {
            "daily_created": dict(daily_created),
            "daily_merged": dict(daily_merged)
        }

    def analyze_monthly_stats(self, devin_prs: List[Dict]) -> Dict:
        """月別統計を分析する"""
        monthly_created = defaultdict(int)
        monthly_merged = defaultdict(int)
        
        for pr in devin_prs:
            basic_info = pr.get("basic_info", {})
            
            created_at = basic_info.get("created_at")
            if created_at:
                created_date = datetime.fromisoformat(created_at.replace("Z", ""))
                month_key = created_date.strftime("%Y-%m")
                monthly_created[month_key] += 1
            
            merged_at = basic_info.get("merged_at")
            if merged_at:
                merged_date = datetime.fromisoformat(merged_at.replace("Z", ""))
                month_key = merged_date.strftime("%Y-%m")
                monthly_merged[month_key] += 1
        
        return {
            "monthly_created": dict(monthly_created),
            "monthly_merged": dict(monthly_merged)
        }

    def analyze_policy_areas(self, devin_prs: List[Dict]) -> Dict:
        """政策分野別統計を分析する"""
        policy_areas = defaultdict(int)
        
        for pr in devin_prs:
            labels = pr.get("labels", [])
            
            if not labels:
                policy_areas["その他政策"] += 1
                continue
            
            for label in labels:
                label_name = label.get("name", "")
                if label_name:
                    policy_areas[label_name] += 1
        
        return dict(policy_areas)

    def analyze_success_patterns(self, devin_prs: List[Dict]) -> Dict:
        """成功パターンを分析する"""
        total_prs = len(devin_prs)
        merged_prs = []
        failed_prs = []
        
        for pr in devin_prs:
            basic_info = pr.get("basic_info", {})
            merged_at = basic_info.get("merged_at")
            
            if merged_at:
                merged_prs.append(pr)
            else:
                failed_prs.append(pr)
        
        success_rate = (len(merged_prs) / total_prs * 100) if total_prs > 0 else 0
        
        return {
            "total_prs": total_prs,
            "merged_prs": len(merged_prs),
            "failed_prs": len(failed_prs),
            "success_rate": success_rate
        }

    def estimate_credit_usage(self, devin_prs: List[Dict]) -> Dict:
        """クレジット使用量を推定する"""
        total_prs = len(devin_prs)
        
        estimated_credits_per_pr = 50
        
        total_estimated_credits = total_prs * estimated_credits_per_pr
        
        merged_prs = sum(1 for pr in devin_prs if pr.get("basic_info", {}).get("merged_at"))
        failed_prs = total_prs - merged_prs
        
        return {
            "total_estimated_credits": total_estimated_credits,
            "credits_per_pr": estimated_credits_per_pr,
            "credits_for_merged": merged_prs * estimated_credits_per_pr,
            "credits_for_failed": failed_prs * estimated_credits_per_pr,
            "cost_efficiency": (merged_prs / total_prs) if total_prs > 0 else 0
        }

    def generate_comprehensive_analysis(self, devin_prs: List[Dict]) -> Dict:
        """包括的な分析を実行する"""
        if not devin_prs:
            return {"error": "分析対象のDevin PRがありません"}
        
        analysis = {
            "summary": {
                "total_prs": len(devin_prs),
                "analysis_date": datetime.now().isoformat(),
                "period_analyzed": "全期間"
            },
            "daily_stats": self.analyze_daily_stats(devin_prs),
            "monthly_stats": self.analyze_monthly_stats(devin_prs),
            "policy_areas": self.analyze_policy_areas(devin_prs),
            "success_patterns": self.analyze_success_patterns(devin_prs),
            "credit_estimation": self.estimate_credit_usage(devin_prs)
        }
        
        return analysis

    def save_analysis_results(self, analysis: Dict, output_file: str):
        """分析結果をJSONファイルに保存する"""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(analysis, f, ensure_ascii=False, indent=2)
        
        print(f"分析結果を {output_file} に保存しました")
