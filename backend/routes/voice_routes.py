from flask import Blueprint, jsonify
from voice_parser import get_voice_command, parse_command, extract_update_details
from db import get_connection

voice_bp = Blueprint("voice", __name__)

@voice_bp.route("/voice", methods=["GET"])
def voice():
    text = get_voice_command()
    action = parse_command(text)

    if action == "SHOW_PRODUCTS":
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM Product")
        return jsonify(cursor.fetchall())

    elif action == "LOW_STOCK":
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM Product WHERE is_low_stock = TRUE")
        return jsonify(cursor.fetchall())

    elif action == "UPDATE_STOCK":
        product, qty = extract_update_details(text)

        if not product or qty is None:
            return {"error": "Could not parse command"}

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE Product SET quantity = %s WHERE P_Name = %s",
            (qty, product)
        )

        conn.commit()

        return {"message": f"{product} updated to {qty}"}

    return {"command": text, "action": "UNKNOWN"}