#!/usr/bin/env python3
"""
CSVファイルをJSONフォーマットに変換し、新しいデータを統合するスクリプト
"""

import csv
import json
import os
from datetime import datetime
from dateutil import parser
from typing import Dict, List, Set, Tuple

def parse_date_to_standard(date_str: str) -> str:
    """日付文字列を "May 31, 2025" から "2025-05-31" 形式に変換"""
    if not date_str or date_str.strip() == "":
        return ""
    
    try:
        parsed_date = parser.parse(date_str)
        return parsed_date.strftime("%Y-%m-%d")
    except Exception as e:
        print(f"日付変換エラー: {date_str} -> {e}")
        return date_str

def load_existing_csv_data(csv_file_path: str) -> List[Dict]:
    """既存のCSVファイルからデータを読み込み"""
    data = []
    
    if not os.path.exists(csv_file_path):
        print(f"CSVファイルが見つかりません: {csv_file_path}")
        return data
    
    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            if not any(row.values()):
                continue
                
            session_data = {
                "session": row.get('Session', '').strip(),
                "created_at": parse_date_to_standard(row.get('Created At', '')),
                "acus_used": float(row.get('ACUs Used', 0)) if row.get('ACUs Used') else 0
            }
            data.append(session_data)
    
    return data

def parse_new_data() -> List[Dict]:
    """ユーザーから提供された新しいデータを解析"""
    new_data_raw = [
        ("Slack message about commits", "Jun 12, 2025", "0.44"),
        ("README更新とアーカイブ", "Jun 12, 2025", "0.37"),
        ("データ整合性チェック", "Jun 12, 2025", "0.56"),
        ("データ整合性チェック", "Jun 12, 2025", "2.88"),
        ("Improve policy-pr-hub requirements", "Jun 11, 2025", "0.97"),
        ("Vite OGP表示問題", "Jun 11, 2025", "0.49"),
        ("PR対応統合と報告", "Jun 10, 2025", "6"),
        ("Untitled", "Jun 10, 2025", "0"),
        ("ファイル名をタイトルに変更", "Jun 10, 2025", "1.33"),
        ("データ整合性チェック修正", "Jun 10, 2025", "0.4"),
        ("GitHub Action PR Merge Notification", "Jun 08, 2025", "0.67"),
        ("10段階ヒストグラム作成", "Jun 08, 2025", "0.76"),
        ("fact-checker issue確認", "Jun 08, 2025", "12.14"),
        ("リポジトリ権限確認", "Jun 08, 2025", "0.55"),
        ("プルリクエストコメント集計", "Jun 08, 2025", "1.25"),
        ("collect public repo stats", "Jun 08, 2025", "2.25"),
        ("Explain issue in Slack", "Jun 08, 2025", "2.71"),
        ("Slack issue implementation", "Jun 07, 2025", "22.87"),
        ("OpenRouter対応とGemini使用確認", "Jun 07, 2025", "0.36"),
        ("Slack message about duplicate issues", "Jun 07, 2025", "0.42"),
        ("github連携確認", "Jun 07, 2025", "0.17"),
        ("Slack AIあんの環境構築", "Jun 07, 2025", "15.1"),
        ("Received Slack message", "Jun 07, 2025", "0.23"),
        ("issue実装依頼", "Jun 07, 2025", "2.43"),
        ("Devin API 統計作成", "Jun 07, 2025", "5.38"),
        ("PRレビュー準備", "Jun 07, 2025", "1.84"),
        ("Change postermap headers title", "Jun 07, 2025", "2.63"),
        ("After Effects intro outro animation", "Jun 07, 2025", "1.72"),
        ("issue実装依頼", "Jun 06, 2025", "11.88"),
        ("issue実装依頼", "Jun 06, 2025", "2.86"),
        ("PR統計JSON出力コード作成", "Jun 10, 2025", "4.07"),
        ("Slack PR label report", "Jun 10, 2025", "7.82"),
        ("解説とコンフリクト解消", "Jun 10, 2025", "0.29"),
        ("Slack PR analysis status", "Jun 10, 2025", "0.82"),
        ("README修正", "Jun 10, 2025", "0.98"),
        ("私の権限でできること", "Jun 10, 2025", "0.23"),
        ("リポジトリ列挙", "Jun 10, 2025", "2.11"),
        ("Slack message milestone summary", "Jun 09, 2025", "2.11"),
        ("pr_analysisローカル環境構築方法", "Jun 09, 2025", "0.24")
    ]
    
    new_data = []
    for session, date, acus in new_data_raw:
        session_data = {
            "session": session.strip(),
            "created_at": parse_date_to_standard(date),
            "acus_used": float(acus) if acus else 0
        }
        new_data.append(session_data)
    
    return new_data

def remove_duplicates(existing_data: List[Dict], new_data: List[Dict]) -> List[Dict]:
    """重複を除去してデータを統合"""
    existing_keys: Set[Tuple[str, str]] = set()
    for item in existing_data:
        key = (item["session"].lower(), item["created_at"])
        existing_keys.add(key)
    
    unique_new_data = []
    seen_new_keys: Set[Tuple[str, str]] = set()
    
    for item in new_data:
        key = (item["session"].lower(), item["created_at"])
        
        if key in existing_keys:
            print(f"重複をスキップ: {item['session']} ({item['created_at']})")
            continue
        
        if key in seen_new_keys:
            print(f"新データ内重複をスキップ: {item['session']} ({item['created_at']})")
            continue
        
        seen_new_keys.add(key)
        unique_new_data.append(item)
    
    combined_data = existing_data + unique_new_data
    
    combined_data.sort(key=lambda x: x["created_at"], reverse=True)
    
    return combined_data

def create_json_output(data: List[Dict], output_file: str):
    """JSONファイルを作成"""
    json_structure = {
        "metadata": {
            "last_updated": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "total_records": len(data),
            "description": "Devin usage history data",
            "format_version": "1.0"
        },
        "data": data
    }
    
    with open(output_file, 'w', encoding='utf-8') as jsonfile:
        json.dump(json_structure, jsonfile, ensure_ascii=False, indent=2)
    
    print(f"JSONファイルが作成されました: {output_file}")
    print(f"総レコード数: {len(data)}")

def main():
    """メイン処理"""
    csv_file = "data/usage_history.csv"
    json_file = "data/usage_history.json"
    
    print("既存CSVデータを読み込み中...")
    existing_data = load_existing_csv_data(csv_file)
    print(f"既存データ: {len(existing_data)}件")
    
    print("新しいデータを解析中...")
    new_data = parse_new_data()
    print(f"新しいデータ: {len(new_data)}件")
    
    print("重複を除去してデータを統合中...")
    combined_data = remove_duplicates(existing_data, new_data)
    print(f"統合後データ: {len(combined_data)}件")
    
    print("JSONファイルを作成中...")
    create_json_output(combined_data, json_file)
    
    print("変換完了!")

if __name__ == "__main__":
    main()
