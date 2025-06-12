#!/usr/bin/env python3
"""
ブラウザ収集データ統合スクリプト

Chrome DevToolsで収集したセッションデータを既存の分析システムに統合します。
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from src.utils.github_api import load_config
from src.collectors.usage_history_collector import UsageHistoryCollector


def load_browser_data(file_path: str) -> dict:
    """ブラウザ収集データを読み込む"""
    if not os.path.exists(file_path):
        print(f"⚠️ ブラウザデータファイルが見つかりません: {file_path}")
        return {}
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ ブラウザデータ読み込みエラー: {e}")
        return {}


def convert_browser_to_usage_format(browser_data: dict) -> list:
    """ブラウザデータを既存のusage_history形式に変換"""
    if not browser_data or 'data' not in browser_data:
        return []
    
    converted_data = []
    for session in browser_data['data']:
        converted_session = {
            "session_name": session.get("session", "Untitled"),
            "session_id": session.get("session_id", ""),
            "created_at": session.get("created_at", ""),
            "acus_used": float(session.get("acus_used", 0)),
            "date": session.get("created_at", "")
        }
        converted_data.append(converted_session)
    
    return converted_data


def merge_usage_data(existing_data: list, browser_data: list) -> list:
    """既存データとブラウザデータをマージ"""
    session_ids = set()
    merged_data = []
    
    for session in existing_data:
        session_id = session.get("session_id", "")
        if session_id and session_id not in session_ids:
            session_ids.add(session_id)
            merged_data.append(session)
        elif not session_id:
            session_key = f"{session.get('session_name', '')}_{session.get('created_at', '')}"
            if session_key not in session_ids:
                session_ids.add(session_key)
                merged_data.append(session)
    
    for session in browser_data:
        session_id = session.get("session_id", "")
        if session_id and session_id not in session_ids:
            session_ids.add(session_id)
            merged_data.append(session)
        elif not session_id:
            session_key = f"{session.get('session_name', '')}_{session.get('created_at', '')}"
            if session_key not in session_ids:
                session_ids.add(session_key)
                merged_data.append(session)
    
    merged_data.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    return merged_data


def main():
    """メイン処理"""
    config = load_config()
    
    usage_config = config.get("devin_usage", {})
    existing_file = usage_config.get("usage_history_file", "./data/usage_history.json")
    browser_file = usage_config.get("browser_data_file", "./data/usage_history_browser.json")
    
    print("🔄 ブラウザデータ統合を開始します...")
    
    collector = UsageHistoryCollector()
    existing_data = collector.load_usage_data(existing_file)
    print(f"📊 既存データ: {len(existing_data)}セッション")
    
    browser_raw_data = load_browser_data(browser_file)
    browser_data = convert_browser_to_usage_format(browser_raw_data)
    print(f"🌐 ブラウザデータ: {len(browser_data)}セッション")
    
    if not browser_data:
        print("⚠️ ブラウザデータがありません。統合をスキップします。")
        return
    
    merged_data = merge_usage_data(existing_data, browser_data)
    print(f"🔗 統合後データ: {len(merged_data)}セッション")
    
    output_file = "./data/usage_history_integrated.json"
    integrated_data = {
        "metadata": {
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "total_records": len(merged_data),
            "description": "Integrated usage history data (manual + browser collected)",
            "format_version": "1.0",
            "sources": ["manual_input", "browser_collection"]
        },
        "data": merged_data
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(integrated_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 統合データを保存しました: {output_file}")
    
    total_acus = sum(session.get("acus_used", 0) for session in merged_data)
    print(f"\n📈 統合データサマリー:")
    print(f"  総セッション数: {len(merged_data)}")
    print(f"  総ACU使用量: {total_acus:.2f}")
    
    if merged_data:
        latest_date = merged_data[0].get("created_at", "")
        oldest_date = merged_data[-1].get("created_at", "")
        print(f"  期間: {oldest_date} ～ {latest_date}")


if __name__ == "__main__":
    main()
