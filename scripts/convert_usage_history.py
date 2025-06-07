#!/usr/bin/env python3
"""
Usage History変換スクリプト

テキスト形式のUsage HistoryデータをCSVに変換して保存します。
"""

import csv
import os
import re
import sys
from datetime import datetime
from pathlib import Path


def parse_usage_history_text(text_content: str) -> list:
    """テキスト形式のUsage Historyを解析してデータを抽出"""
    sessions = []
    lines = text_content.strip().split('\n')
    
    current_session = {}
    state = 'waiting_for_session'  # waiting_for_session, waiting_for_date, waiting_for_acu
    
    for line in lines:
        line = line.strip()
        
        if line.lower() in ['session', 'created at', 'acus used'] or not line:
            continue
        
        if 'view session' in line.lower():
            if current_session and all(key in current_session for key in ['session_name', 'created_at', 'acus_used']):
                sessions.append(current_session)
            current_session = {}
            state = 'waiting_for_session'
            continue
        
        if state == 'waiting_for_session':
            current_session = {'session_name': line}
            state = 'waiting_for_date'
        
        elif state == 'waiting_for_date':
            if re.match(r'^[A-Za-z]+ \d{1,2}, \d{4}$', line):
                current_session['created_at'] = line
                state = 'waiting_for_acu'
            else:
                current_session['session_name'] += ' ' + line
        
        elif state == 'waiting_for_acu':
            if re.match(r'^\d+\.?\d*$', line):
                current_session['acus_used'] = float(line)
            else:
                if re.match(r'^[A-Za-z]+ \d{1,2}, \d{4}$', line):
                    current_session['created_at'] = line
    
    if current_session and all(key in current_session for key in ['session_name', 'created_at', 'acus_used']):
        sessions.append(current_session)
    
    return sessions


def parse_usage_history_structured(text_content: str) -> list:
    """構造化されたUsage Historyテキストを解析"""
    sessions = []
    lines = text_content.strip().split('\n')
    
    current_session = None
    
    for line in lines:
        line = line.strip()
        
        if not line or line.lower() in ['session', 'created at', 'acus used']:
            continue
        
        if current_session is None:
            current_session = {'session_name': line}
        elif 'created_at' not in current_session:
            if re.match(r'^[A-Za-z]+ \d{1,2}, \d{4}$', line):
                current_session['created_at'] = line
            else:
                current_session['session_name'] += ' ' + line
        elif 'acus_used' not in current_session:
            if re.match(r'^\d+\.?\d*$', line):
                current_session['acus_used'] = float(line)
                sessions.append(current_session)
                current_session = None
    
    return sessions


def save_to_csv(sessions: list, output_file: str):
    """セッションデータをCSVファイルに保存"""
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['Session', 'Created At', 'ACUs Used']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for session in sessions:
            writer.writerow({
                'Session': session.get('session_name', ''),
                'Created At': session.get('created_at', ''),
                'ACUs Used': session.get('acus_used', 0)
            })
    
    print(f"✅ {len(sessions)}件のセッションを {output_file} に保存しました")


def main():
    """メイン処理"""
    if len(sys.argv) < 2:
        print("使用方法: python convert_usage_history.py <input_text_file> [output_csv_file]")
        print("または: echo 'テキストデータ' | python convert_usage_history.py -")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "./data/usage_history.csv"
    
    if input_file == '-':
        text_content = sys.stdin.read()
    else:
        with open(input_file, 'r', encoding='utf-8') as f:
            text_content = f.read()
    
    print("Usage Historyテキストを解析中...")
    
    sessions = parse_usage_history_text(text_content)
    
    if not sessions:
        print("構造化解析を試行中...")
        sessions = parse_usage_history_structured(text_content)
    
    if not sessions:
        print("❌ Usage Historyデータを解析できませんでした")
        print("入力データの形式を確認してください")
        sys.exit(1)
    
    print(f"📊 {len(sessions)}件のセッションを検出しました")
    
    for i, session in enumerate(sessions[:3]):  # 最初の3件を表示
        print(f"  {i+1}. {session.get('session_name', 'N/A')}")
        print(f"     日付: {session.get('created_at', 'N/A')}")
        print(f"     ACU: {session.get('acus_used', 'N/A')}")
    
    if len(sessions) > 3:
        print(f"  ... 他 {len(sessions) - 3} 件")
    
    save_to_csv(sessions, output_file)
    
    print(f"\n次のコマンドで統計分析を実行できます:")
    print(f"python scripts/analyze_devin_stats.py --usage-file {output_file}")


if __name__ == "__main__":
    main()
