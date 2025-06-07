#!/usr/bin/env python3
"""
Devin PR収集モジュール

既存のPRデータからDevin作成PRを特定・収集します。
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from ..utils.github_api import load_config


class DevinPRCollector:
    """Devin作成PRを収集するクラス"""

    def __init__(self, config=None):
        """初期化"""
        self.config = config or load_config()
        self.data_config = self.config["data"]
        self.analysis_config = self.config["analysis"]
        
        self.pr_data_dir = Path(self.data_config["pr_data_dir"])
        self.devin_patterns = self.analysis_config["devin_patterns"]

    def is_devin_pr(self, pr_data: Dict) -> bool:
        """PRがDevin作成かどうかを判定する"""
        if not pr_data or "basic_info" not in pr_data:
            return False
        
        user_info = pr_data["basic_info"].get("user", {})
        login = user_info.get("login", "").lower()
        
        for pattern in self.devin_patterns:
            if pattern.lower() in login:
                return True
        
        return False

    def load_pr_data_from_directory(self, input_dir: Optional[str] = None) -> List[Dict]:
        """PRデータをディレクトリから読み込む"""
        if input_dir:
            data_dir = Path(input_dir)
        else:
            data_dir = self.pr_data_dir
        
        if not data_dir.exists():
            print(f"データディレクトリが存在しません: {data_dir}")
            return []
        
        pr_data = []
        json_files = list(data_dir.glob("*.json"))
        
        print(f"{len(json_files)}件のPRデータファイルを確認中...")
        
        for json_file in json_files:
            if json_file.name == "last_run_info.json":
                continue
                
            try:
                with open(json_file, encoding="utf-8") as f:
                    pr = json.load(f)
                    pr_data.append(pr)
            except Exception as e:
                print(f"{json_file}の読み込み中にエラー: {e}")
        
        return pr_data

    def collect_devin_prs(self, input_dir: Optional[str] = None) -> List[Dict]:
        """Devin作成PRを収集する"""
        all_prs = self.load_pr_data_from_directory(input_dir)
        devin_prs = []
        
        for pr in all_prs:
            if self.is_devin_pr(pr):
                devin_prs.append(pr)
        
        print(f"全{len(all_prs)}件中、Devin作成PR: {len(devin_prs)}件")
        return devin_prs

    def save_devin_prs(self, devin_prs: List[Dict], output_file: str):
        """Devin PRデータをJSONファイルに保存する"""
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(devin_prs, f, ensure_ascii=False, indent=2)
        
        print(f"Devin PRデータを {output_file} に保存しました")

    def get_devin_pr_summary(self, devin_prs: List[Dict]) -> Dict:
        """Devin PRの概要統計を取得する"""
        if not devin_prs:
            return {}
        
        total_count = len(devin_prs)
        merged_count = 0
        open_count = 0
        closed_count = 0
        
        for pr in devin_prs:
            basic_info = pr.get("basic_info", {})
            state = basic_info.get("state", "")
            merged_at = basic_info.get("merged_at")
            
            if merged_at:
                merged_count += 1
            elif state == "open":
                open_count += 1
            elif state == "closed":
                closed_count += 1
        
        return {
            "total": total_count,
            "merged": merged_count,
            "open": open_count,
            "closed": closed_count,
            "success_rate": (merged_count / total_count * 100) if total_count > 0 else 0
        }
