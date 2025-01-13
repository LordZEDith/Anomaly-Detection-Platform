import argparse
import json
import os
from newspaper import Article
from openai import OpenAI
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

def process_news_article(url: str) -> str:
    """Extract text content from a news article URL."""
    try:
        article = Article(url)
        article.download()
        article.parse()
        return f"Title: {article.title}\n\nContent: {article.text[:1000]}"  # Limit content to 1000 chars
    except Exception as e:
        print(f"Error processing article {url}: {str(e)}")
        return ""

def format_market_data(market_data: Dict[str, Any]) -> str:
    """Format market data into a readable string."""
    return f"""
Current Price: ${market_data.get('currentPrice', 'N/A')}
Previous Close: ${market_data.get('previousClose', 'N/A')}
Price Change: ${market_data.get('priceChange', 'N/A')} ({market_data.get('priceChangePercent', 'N/A')}%)
52 Week High: ${market_data.get('week52High', 'N/A')}
52 Week Low: ${market_data.get('week52Low', 'N/A')}
Market Cap: ${market_data.get('marketCap', 'N/A')}
P/E Ratio: {market_data.get('peRatio', 'N/A')}
Dividend Yield: {market_data.get('divYield', 'N/A')}
"""

def get_system_prompt(symbol: str, strategy_name: str = '', strategy_purpose: str = '') -> str:
    """Generate the system prompt for the AI."""
    base_prompt = f"""You are a professional financial advisor AI assistant analyzing {symbol}.
Your goal is to provide clear, concise analysis based on the provided market data, news, and anomaly detection results."""

    if strategy_name and strategy_purpose:
        base_prompt += f"""
        
Currently analyzing the {strategy_name} strategy which {strategy_purpose}.
When providing analysis, focus on how this strategy's indicators and features can be used to make informed decisions."""

    base_prompt += """
Focus on:
1. Current market position and recent performance
2. Key technical indicators and anomalies detected
3. Recent news impact on the stock
4. Potential risks and opportunities
5. Clear buy/hold/sell recommendations with time horizons

Keep responses concise and well-structured. If asked about topics outside of the provided data,
acknowledge the limitations of your current information."""
    return base_prompt

def format_features(base_features: Dict[str, str], derived_features: List[str]) -> str:
    """Format the features information into a readable string."""
    features_str = "Base Features:\n"
    for symbol, description in base_features.items():
        features_str += f"- {symbol}: {description}\n"
    
    if derived_features:
        features_str += "\nDerived Features:\n"
        for feature in derived_features:
            features_str += f"- {feature}\n"
    
    return features_str

def chat_with_ai(
    messages: List[Dict[str, str]], 
    market_data: Dict[str, Any] = None, 
    news_data: List[Dict[str, Any]] = None, 
    symbol: str = '',
    strategy_name: str = '',
    strategy_purpose: str = '',
    base_features: Dict[str, str] = None,
    derived_features: List[str] = None,
    continue_chat: bool = False
) -> str:
    """Handle chat interaction with OpenAI."""
    api_key = os.getenv('OPENAI_API_KEY')
    model = os.getenv('DEFAULT_MODEL', 'gpt-4')
    
    if not api_key:
        raise ValueError("OpenAI API key not found in environment variables")

    client = OpenAI(api_key=api_key)

    if continue_chat:
        ai_messages = messages
    else:
        processed_news = []
        for article in news_data[:2]:  # Only 2 latest articles
            article_text = process_news_article(article['link'])
            if article_text:
                processed_news.append(article_text)

        market_context = format_market_data(market_data)
        news_context = "\n\n".join(processed_news)
        features_context = format_features(base_features or {}, derived_features or [])

        system_prompt = get_system_prompt(symbol, strategy_name, strategy_purpose)
        
        ai_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"""
Here's the current market data for {symbol}:
{market_context}

Strategy Information:
{features_context}

Recent news articles:
{news_context}

Please provide your analysis and respond to: {messages[-1]['content']}
"""}
        ]

        if len(messages) > 1:
            ai_messages[1:-1] = messages[:-1]

    try:
        chat_completion = client.chat.completions.create(
            model=model,
            messages=ai_messages,
            max_tokens=1000
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        raise Exception(f"Error getting AI response: {str(e)}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--messages', type=str, required=True)
    parser.add_argument('--market_data', type=str, default='{}')
    parser.add_argument('--news_data', type=str, default='[]')
    parser.add_argument('--strategy_name', type=str, default='')
    parser.add_argument('--strategy_purpose', type=str, default='')
    parser.add_argument('--base_features', type=str, default='{}')
    parser.add_argument('--derived_features', type=str, default='[]')
    parser.add_argument('--continue_chat', type=str, default='false')
    
    args = parser.parse_args()
    
    try:
        messages = json.loads(args.messages)
        continue_chat = args.continue_chat.lower() == 'true'
        
        if continue_chat:
            response = chat_with_ai(messages, continue_chat=True)
        else:
            market_data = json.loads(args.market_data)
            news_data = json.loads(args.news_data)
            base_features = json.loads(args.base_features)
            derived_features = json.loads(args.derived_features)
            
            symbol = market_data.get('symbol', 'Unknown')
            response = chat_with_ai(
                messages, 
                market_data, 
                news_data, 
                symbol,
                args.strategy_name,
                args.strategy_purpose,
                base_features,
                derived_features
            )
        
        print(json.dumps({"message": response}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main() 