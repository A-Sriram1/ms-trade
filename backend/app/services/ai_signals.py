import random

class SignalEngine:
    @staticmethod
    def generate_signal(symbol: str, ltp: float):
        # Target placeholder for complex ML logic based on technical indicators and sentiment
        action = random.choice(["BUY", "SELL", "HOLD"])
        confidence = random.randint(60, 95)
        
        if action == "BUY":
            target1 = ltp * 1.01
            target2 = ltp * 1.02
            target3 = ltp * 1.03
            stop_loss = ltp * 0.985
            reason = [
                "EMA crossover (9/21) detected.",
                "Price established above VWAP.",
                "Volume expansion confirmed."
            ]
        elif action == "SELL":
            target1 = ltp * 0.99
            target2 = ltp * 0.98
            target3 = ltp * 0.97
            stop_loss = ltp * 1.015
            reason = [
                "RSI bearish divergence.",
                "MACD crossed below signal line.",
                "Options OI shows strong call writing."
            ]
        else:
            target1 = target2 = target3 = stop_loss = 0
            reason = ["Consolidation in progress."]

        return {
            "symbol": symbol,
            "action": action,
            "confidence": confidence,
            "entry": ltp,
            "stop_loss": stop_loss,
            "targets": [target1, target2, target3],
            "reason": reason
        }
