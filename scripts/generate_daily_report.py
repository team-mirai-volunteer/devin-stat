#!/usr/bin/env python3
"""
日次レポート生成スクリプト

GitHub Actionsから呼び出される日次レポート生成用スクリプト
"""

import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.collectors.devin_pr_collector import DevinPRCollector
from src.collectors.devin_api_client import DevinAPIClient
from src.analyzers.devin_stats_analyzer import DevinStatsAnalyzer
from src.generators.devin_report_generator import DevinReportGenerator
from src.utils.github_api import load_config


def main():
    """日次レポート生成メイン処理"""
    print(f"=== Devin日次レポート生成 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")
    
    try:
        config = load_config()
        
        reports_dir = config["data"]["reports_dir"]
        os.makedirs(reports_dir, exist_ok=True)
        
        print("1. Devin PRデータ収集...")
        collector = DevinPRCollector(config)
        devin_prs = collector.collect_devin_prs()
        
        if not devin_prs:
            print("⚠️ Devin作成PRが見つかりませんでした")
            empty_analysis = {"error": "Devin作成PRが見つかりませんでした"}
            generator = DevinReportGenerator(config)
            daily_report = generator.generate_daily_report(empty_analysis)
            
            report_file = os.path.join(reports_dir, f"daily_report_{datetime.now().strftime('%Y%m%d')}.md")
            generator.save_report(daily_report, report_file)
            print(f"空のレポートを生成: {report_file}")
            return
        
        summary = collector.get_devin_pr_summary(devin_prs)
        print(f"📊 基本統計: 総{summary['total']}件, マージ済み{summary['merged']}件")
        
        print("2. 統計分析実行...")
        analyzer = DevinStatsAnalyzer(config)
        analysis = analyzer.generate_comprehensive_analysis(devin_prs)
        
        print("3. Devin API統計取得...")
        api_client = DevinAPIClient(config)
        api_data = api_client.analyze_pr_related_sessions(days_back=7)  # 過去7日分
        
        print("4. 日次レポート生成...")
        generator = DevinReportGenerator(config)
        daily_report = generator.generate_daily_report(analysis, api_data)
        
        report_file = os.path.join(reports_dir, f"daily_report_{datetime.now().strftime('%Y%m%d')}.md")
        generator.save_report(daily_report, report_file)
        
        analysis_file = os.path.join(reports_dir, f"analysis_{datetime.now().strftime('%Y%m%d')}.json")
        analyzer.save_analysis_results(analysis, analysis_file)
        
        print(f"✅ 日次レポート生成完了: {report_file}")
        print(f"✅ 分析結果保存: {analysis_file}")
        
        if os.getenv("GITHUB_ACTIONS"):
            print(f"::set-output name=report_file::{report_file}")
            print(f"::set-output name=total_prs::{summary['total']}")
            print(f"::set-output name=merged_prs::{summary['merged']}")
            print(f"::set-output name=success_rate::{summary['success_rate']:.1f}")
        
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
