from flask import Flask
from routes.main import main_blueprint

app = Flask(__name__)
app.register_blueprint(main_blueprint)

if __name__ == "__main__":
    # debug mode for development
    app.run(debug=True)
