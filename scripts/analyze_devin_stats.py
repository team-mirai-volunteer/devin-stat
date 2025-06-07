#!/usr/bin/env python3
"""
Devin統計分析メインスクリプト

既存のPRデータからDevin統計を分析し、レポートを生成します。
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.collectors.devin_pr_collector import DevinPRCollector
from src.collectors.devin_api_client import DevinAPIClient
from src.collectors.usage_history_collector import UsageHistoryCollector
from src.analyzers.devin_stats_analyzer import DevinStatsAnalyzer
from src.generators.devin_report_generator import DevinReportGenerator
from src.utils.github_api import load_config


def parse_args():
    """コマンドライン引数を解析する"""
    parser = argparse.ArgumentParser(description="Devin統計分析")
    parser.add_argument(
        "--pr-data-dir",
        help="PRデータディレクトリのパス",
        default=None
    )
    parser.add_argument(
        "--output-dir",
        help="出力ディレクトリのパス",
        default="./reports"
    )
    parser.add_argument(
        "--save-raw-data",
        help="生のDevin PRデータを保存する",
        action="store_true"
    )
    parser.add_argument(
        "--console-only",
        help="コンソール出力のみ（ファイル保存なし）",
        action="store_true"
    )
    parser.add_argument(
        "--usage-file",
        help="Usage HistoryファイルのパスCSV/JSON形式）"
    )
    return parser.parse_args()


def main():
    """メイン関数"""
    args = parse_args()
    config = load_config()
    
    print("=== Devin統計分析開始 ===")
    
    print("\n1. Devin PRデータ収集中...")
    collector = DevinPRCollector(config)
    devin_prs = collector.collect_devin_prs(args.pr_data_dir)
    
    if not devin_prs:
        print("❌ Devin作成PRが見つかりませんでした")
        return
    
    summary = collector.get_devin_pr_summary(devin_prs)
    print(f"\n📊 基本統計:")
    print(f"  - 総PR数: {summary['total']}件")
    print(f"  - マージ済み: {summary['merged']}件")
    print(f"  - オープン: {summary['open']}件")
    print(f"  - クローズ: {summary['closed']}件")
    print(f"  - 成功率: {summary['success_rate']:.1f}%")
    
    if args.save_raw_data and not args.console_only:
        raw_data_file = Path(args.output_dir) / "devin_prs_raw.json"
        collector.save_devin_prs(devin_prs, str(raw_data_file))
    
    print("\n2. 詳細統計分析中...")
    analyzer = DevinStatsAnalyzer(config)
    
    usage_data = None
    if args.usage_file:
        print(f"3. Usage Historyデータ読み込み中: {args.usage_file}")
        usage_collector = UsageHistoryCollector()
        usage_data = usage_collector.load_usage_data(args.usage_file)
        if usage_data:
            print(f"   ✅ {len(usage_data)}件のセッションデータを読み込みました")
        else:
            print("   ⚠️ Usage Historyデータの読み込みに失敗しました")
    else:
        print("3. Usage Historyファイルが指定されていません（推定値を使用）")
    
    analysis = analyzer.generate_comprehensive_analysis(devin_prs, usage_data)
    
    print("\n4. Devin API統計取得中...")
    api_client = DevinAPIClient(config)
    api_data = api_client.analyze_pr_related_sessions()
    
    if api_data.get("api_available"):
        print(f"  ✅ API接続成功: {api_data['total_pr_sessions']}セッション")
    else:
        print("  ⚠️ API接続不可（DEVIN_API_TOKENが未設定）")
    
    print("\n5. レポート生成中...")
    generator = DevinReportGenerator(config)
    
    if args.console_only:
        daily_report = generator.generate_daily_report(analysis, api_data)
        print("\n" + "="*50)
        print(daily_report)
    else:
        reports = generator.generate_all_reports(analysis, api_data, args.output_dir)
        print(f"  ✅ 日次レポート: {reports['daily_report']}")
        print(f"  ✅ 月次サマリー: {reports['monthly_summary']}")
        
        analysis_file = Path(args.output_dir) / "devin_analysis.json"
        analyzer.save_analysis_results(analysis, str(analysis_file))
        print(f"  ✅ 分析結果: {analysis_file}")
    
    print("\n=== 分析完了 ===")


if __name__ == "__main__":
    main()
