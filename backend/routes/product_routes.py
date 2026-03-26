from flask import Blueprint, request, jsonify
from db import get_connection

product_bp = Blueprint("product", __name__)

@product_bp.route("/products", methods=["GET"])
def get_products():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM Product")
    data = cursor.fetchall()

    return jsonify(data)

@product_bp.route("/update", methods=["POST"])
def update_stock():
    data = request.json

    p_id = data.get("P_ID")
    quantity = data.get("quantity")

    if not p_id or quantity is None:
        return {"error": "Invalid input"}, 400

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE Product SET quantity = %s WHERE P_ID = %s",
        (quantity, p_id)
    )

    conn.commit()

    return {"message": "Stock updated successfully"}

@product_bp.route("/low-stock", methods=["GET"])
def low_stock():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM Product WHERE is_low_stock = TRUE")
    data = cursor.fetchall()

    return jsonify(data)