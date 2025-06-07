#!/usr/bin/env python3
"""
Devin API関連のユーティリティ関数

Devin APIを呼び出すための共通機能を提供します。
"""

import os
import requests
from typing import Dict, List, Optional
import backoff

from .github_api import load_config


def get_devin_token():
    """環境変数からDevinトークンを取得する"""
    config = load_config()
    token_env_var = config["devin_api"]["token_env_var"]
    return os.environ.get(token_env_var)


def get_devin_headers():
    """Devin APIリクエスト用のヘッダーを取得する"""
    token = get_devin_token()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


@backoff.on_exception(
    backoff.expo,
    (requests.exceptions.RequestException, requests.exceptions.HTTPError),
    max_tries=3,
    max_time=30,
    giveup=lambda e: isinstance(e, requests.exceptions.HTTPError)
    and e.response.status_code in [401, 403, 404],
)
def make_devin_api_request(endpoint, params=None, headers=None):
    """Devin APIリクエストを実行し、再試行ロジックを適用する"""
    config = load_config()
    base_url = config["devin_api"]["base_url"]
    
    if headers is None:
        headers = get_devin_headers()
    
    url = f"{base_url}{endpoint}"
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()


def is_devin_api_available():
    """Devin APIが利用可能かチェックする"""
    token = get_devin_token()
    if not token:
        return False
    
    try:
        make_devin_api_request("/sessions", params={"limit": 1})
        return True
    except Exception:
        return False
