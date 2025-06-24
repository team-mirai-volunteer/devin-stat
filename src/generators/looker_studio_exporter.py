#!/usr/bin/env python3
"""
Looker Studio用データエクスポートモジュール

Devin統計分析結果をLooker Studio用のCSV形式に変換します。
"""

import csv
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from ..utils.github_api import load_config


class LookerStudioExporter:
    """Looker Studio用データエクスポートクラス"""

    def __init__(self, config=None):
        """初期化"""
        self.config = config or load_config()

    def transform_to_flat_data(self, analysis: Dict) -> List[Dict]:
        """分析結果をフラットなデータ構造に変換"""
        if "error" in analysis:
            return []
        
        flat_data = []
        
        summary = analysis.get("summary", {})
        analysis_date = summary.get("analysis_date", datetime.now().isoformat())
        data_source = analysis.get("acu_analysis", {}).get("data_source", "estimated")
        
        daily_stats = analysis.get("daily_stats", {})
        
        daily_created = daily_stats.get("daily_created", {})
        for date, count in daily_created.items():
            flat_data.append({
                "date": date,
                "metric_type": "pr_created",
                "value": count,
                "category": "daily",
                "data_source": data_source,
                "analysis_date": analysis_date
            })
        
        daily_merged = daily_stats.get("daily_merged", {})
        for date, count in daily_merged.items():
            flat_data.append({
                "date": date,
                "metric_type": "pr_merged",
                "value": count,
                "category": "daily",
                "data_source": data_source,
                "analysis_date": analysis_date
            })
        
        monthly_stats = analysis.get("monthly_stats", {})
        
        monthly_created = monthly_stats.get("monthly_created", {})
        for month, count in monthly_created.items():
            flat_data.append({
                "date": f"{month}-01",
                "metric_type": "pr_created",
                "value": count,
                "category": "monthly",
                "data_source": data_source,
                "analysis_date": analysis_date
            })
        
        monthly_merged = monthly_stats.get("monthly_merged", {})
        for month, count in monthly_merged.items():
            flat_data.append({
                "date": f"{month}-01",
                "metric_type": "pr_merged",
                "value": count,
                "category": "monthly",
                "data_source": data_source,
                "analysis_date": analysis_date
            })
        
        success_patterns = analysis.get("success_patterns", {})
        success_date = analysis_date.split("T")[0]
        
        flat_data.extend([
            {
                "date": success_date,
                "metric_type": "total_prs",
                "value": success_patterns.get("total_prs", 0),
                "category": "summary",
                "data_source": data_source,
                "analysis_date": analysis_date
            },
            {
                "date": success_date,
                "metric_type": "merged_prs",
                "value": success_patterns.get("merged_prs", 0),
                "category": "summary",
                "data_source": data_source,
                "analysis_date": analysis_date
            },
            {
                "date": success_date,
                "metric_type": "failed_prs",
                "value": success_patterns.get("failed_prs", 0),
                "category": "summary",
                "data_source": data_source,
                "analysis_date": analysis_date
            },
            {
                "date": success_date,
                "metric_type": "success_rate",
                "value": success_patterns.get("success_rate", 0),
                "category": "summary",
                "data_source": data_source,
                "analysis_date": analysis_date
            }
        ])
        
        acu_analysis = analysis.get("acu_analysis", {})
        
        if data_source == "actual_usage_history":
            acu_metrics = [
                ("total_acus", acu_analysis.get("total_acus", 0)),
                ("acus_per_pr", acu_analysis.get("acus_per_pr", 0)),
                ("pr_sessions", acu_analysis.get("pr_sessions", 0)),
                ("cost_efficiency", acu_analysis.get("cost_efficiency", 0))
            ]
        else:
            acu_metrics = [
                ("total_estimated_acus", acu_analysis.get("total_estimated_acus", 0)),
                ("acus_per_pr", acu_analysis.get("acus_per_pr", 0)),
                ("acus_for_merged", acu_analysis.get("acus_for_merged", 0)),
                ("acus_for_failed", acu_analysis.get("acus_for_failed", 0)),
                ("cost_efficiency", acu_analysis.get("cost_efficiency", 0))
            ]
        
        for metric_name, value in acu_metrics:
            flat_data.append({
                "date": success_date,
                "metric_type": metric_name,
                "value": value,
                "category": "acu_analysis",
                "data_source": data_source,
                "analysis_date": analysis_date
            })
        
        return flat_data

    def export_to_csv(self, analysis: Dict, output_file: str) -> str:
        """分析結果をCSVファイルにエクスポート"""
        flat_data = self.transform_to_flat_data(analysis)
        
        if not flat_data:
            raise ValueError("エクスポートするデータがありません")
        
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        fieldnames = ["date", "metric_type", "value", "category", "data_source", "analysis_date"]
        
        with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(flat_data)
        
        print(f"Looker Studio用CSVファイルを {output_file} に保存しました")
        print(f"エクスポートされたレコード数: {len(flat_data)}件")
        
        return str(output_path)

    def export_to_json(self, analysis: Dict, output_file: str) -> str:
        """分析結果をJSON形式でエクスポート（Looker Studio用フラット構造）"""
        flat_data = self.transform_to_flat_data(analysis)
        
        if not flat_data:
            raise ValueError("エクスポートするデータがありません")
        
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        export_data = {
            "metadata": {
                "export_date": datetime.now().isoformat(),
                "total_records": len(flat_data),
                "data_source": analysis.get("acu_analysis", {}).get("data_source", "estimated"),
                "analysis_date": analysis.get("summary", {}).get("analysis_date", ""),
                "format_version": "1.0"
            },
            "data": flat_data
        }
        
        with open(output_path, "w", encoding="utf-8") as jsonfile:
            json.dump(export_data, jsonfile, ensure_ascii=False, indent=2)
        
        print(f"Looker Studio用JSONファイルを {output_file} に保存しました")
        print(f"エクスポートされたレコード数: {len(flat_data)}件")
        
        return str(output_path)

    def generate_looker_studio_exports(self, analysis: Dict, output_dir: str = "./reports") -> Dict[str, str]:
        """Looker Studio用のすべてのエクスポートファイルを生成"""
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d')
        
        csv_file = os.path.join(output_dir, f"looker_studio_data_{timestamp}.csv")
        csv_path = self.export_to_csv(analysis, csv_file)
        
        json_file = os.path.join(output_dir, f"looker_studio_data_{timestamp}.json")
        json_path = self.export_to_json(analysis, json_file)
        
        return {
            "csv_export": csv_path,
            "json_export": json_path
        }
