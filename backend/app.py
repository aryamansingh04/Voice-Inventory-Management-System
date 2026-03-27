from flask import Flask, jsonify
from flask_cors import CORS

# import routes
from routes.product_routes import product_bp
from routes.voice_routes import voice_bp

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# register routes
app.register_blueprint(product_bp)
app.register_blueprint(voice_bp)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "Route not found"}), 404


@app.errorhandler(500)
def internal_error(_error):
    return jsonify({"error": "Internal server error"}), 500


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    return response


if __name__ == "__main__":
    app.run(debug=True)