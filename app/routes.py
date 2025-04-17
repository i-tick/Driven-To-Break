from flask import render_template, Blueprint

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    return render_template('index.html')

@bp.route('/visualizations')
def visualizations():
    return render_template('visualizations.html')