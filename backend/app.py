from flask import Flask
from flask_cors import CORS

# import routes
from routes.product_routes import product_bp
from routes.voice_routes import voice_bp

app = Flask(__name__)
CORS(app)

# register routes
app.register_blueprint(product_bp)
app.register_blueprint(voice_bp)

if __name__ == "__main__":
    app.run(debug=True)