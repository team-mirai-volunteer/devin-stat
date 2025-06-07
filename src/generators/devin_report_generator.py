#!/usr/bin/env python3
"""
Devinレポート生成モジュール

Devin統計分析結果からマークダウンレポートを生成します。
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from ..utils.github_api import load_config


class DevinReportGenerator:
    """Devinレポート生成クラス"""

    def __init__(self, config=None):
        """初期化"""
        self.config = config or load_config()

    def generate_daily_report(self, analysis: Dict, api_data: Optional[Dict] = None) -> str:
        """日次レポートを生成する"""
        if "error" in analysis:
            return f"# Devin日次レポート\n\nエラー: {analysis['error']}\n"
        
        summary = analysis.get("summary", {})
        daily_stats = analysis.get("daily_stats", {})
        policy_areas = analysis.get("policy_areas", {})
        success_patterns = analysis.get("success_patterns", {})
        credit_estimation = analysis.get("credit_estimation", {})
        
        report = f"""# Devin日次統計レポート

生成日時: {datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}


- **総Devin PR数**: {summary.get('total_prs', 0)}件
- **マージ済み**: {success_patterns.get('merged_prs', 0)}件
- **失敗/クローズ**: {success_patterns.get('failed_prs', 0)}件
- **成功率**: {success_patterns.get('success_rate', 0):.1f}%


"""
        
        daily_created = daily_stats.get("daily_created", {})
        if daily_created:
            sorted_dates = sorted(daily_created.keys(), reverse=True)[:30]
            for date in sorted_dates:
                count = daily_created[date]
                report += f"- {date}: {count}件作成\n"
        else:
            report += "- データなし\n"
        
        report += "\n### PRマージ数\n"
        daily_merged = daily_stats.get("daily_merged", {})
        if daily_merged:
            sorted_dates = sorted(daily_merged.keys(), reverse=True)[:30]
            for date in sorted_dates:
                count = daily_merged[date]
                report += f"- {date}: {count}件マージ\n"
        else:
            report += "- データなし\n"
        
        report += "\n## 🏷️ 政策分野別統計\n\n"
        if policy_areas:
            sorted_areas = sorted(policy_areas.items(), key=lambda x: x[1], reverse=True)
            for area, count in sorted_areas:
                report += f"- **{area}**: {count}件\n"
        else:
            report += "- データなし\n"
        
        report += f"""

- **推定総クレジット使用量**: {credit_estimation.get('total_estimated_credits', 0):,} クレジット
- **PR作成あたり平均**: {credit_estimation.get('credits_per_pr', 0)} クレジット
- **コスト効率**: {credit_estimation.get('cost_efficiency', 0):.1f} (成功率)

"""
        
        if api_data and api_data.get("api_available"):
            report += f"""## 🔌 Devin API統計

- **API接続**: ✅ 利用可能
- **PR関連セッション**: {api_data.get('total_pr_sessions', 0)}件
- **実際のクレジット使用量**: {api_data.get('estimated_credits', 0):,} クレジット

"""
            api_daily = api_data.get("daily_stats", {})
            if api_daily:
                sorted_dates = sorted(api_daily.keys(), reverse=True)[:7]
                for date in sorted_dates:
                    stats = api_daily[date]
                    sessions = stats.get("pr_sessions", 0)
                    credits = stats.get("estimated_credits", 0)
                    report += f"- {date}: {sessions}セッション, {credits}クレジット\n"
        else:
            report += """## 🔌 Devin API統計

- **API接続**: ❌ 利用不可（DEVIN_API_TOKENが設定されていません）
- **推定値**: 上記のクレジット使用量は推定値です

"""
        
        report += f"""
---

*このレポートは自動生成されました。*
*最新の情報については、GitHub Actionsワークフローをご確認ください。*
"""
        
        return report

    def generate_monthly_summary(self, analysis: Dict) -> str:
        """月次サマリーレポートを生成する"""
        if "error" in analysis:
            return f"# Devin月次サマリー\n\nエラー: {analysis['error']}\n"
        
        summary = analysis.get("summary", {})
        monthly_stats = analysis.get("monthly_stats", {})
        success_patterns = analysis.get("success_patterns", {})
        
        report = f"""# Devin月次サマリーレポート

生成日時: {datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}


- **総Devin PR数**: {summary.get('total_prs', 0)}件
- **マージ済み**: {success_patterns.get('merged_prs', 0)}件
- **成功率**: {success_patterns.get('success_rate', 0):.1f}%


"""
        
        monthly_created = monthly_stats.get("monthly_created", {})
        if monthly_created:
            sorted_months = sorted(monthly_created.keys(), reverse=True)
            for month in sorted_months:
                count = monthly_created[month]
                report += f"- {month}: {count}件作成\n"
        else:
            report += "- データなし\n"
        
        report += "\n### PRマージ数\n"
        monthly_merged = monthly_stats.get("monthly_merged", {})
        if monthly_merged:
            sorted_months = sorted(monthly_merged.keys(), reverse=True)
            for month in sorted_months:
                count = monthly_merged[month]
                report += f"- {month}: {count}件マージ\n"
        else:
            report += "- データなし\n"
        
        return report

    def save_report(self, report_content: str, output_file: str):
        """レポートをファイルに保存する"""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(report_content)
        
        print(f"レポートを {output_file} に保存しました")

    def generate_all_reports(self, analysis: Dict, api_data: Optional[Dict] = None, output_dir: str = "./reports"):
        """すべてのレポートを生成する"""
        os.makedirs(output_dir, exist_ok=True)
        
        daily_report = self.generate_daily_report(analysis, api_data)
        daily_file = os.path.join(output_dir, f"devin_daily_report_{datetime.now().strftime('%Y%m%d')}.md")
        self.save_report(daily_report, daily_file)
        
        monthly_summary = self.generate_monthly_summary(analysis)
        monthly_file = os.path.join(output_dir, f"devin_monthly_summary_{datetime.now().strftime('%Y%m')}.md")
        self.save_report(monthly_summary, monthly_file)
        
        return {
            "daily_report": daily_file,
            "monthly_summary": monthly_file
        }
