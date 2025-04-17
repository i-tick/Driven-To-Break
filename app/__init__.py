from flask import Flask
from .routes import bp

def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_mapping(
        SECRET_KEY='your_secret_key',
        # Add other configuration variables as needed
    )

    # Register blueprints
    from . import routes
    app.register_blueprint(bp)

    return app