# Visualisation Project

This project is a web application built using Flask that provides various visualizations related to Formula 1 race data. The visualizations aim to analyze and present insights on Did Not Finish (DNF) statistics, failure causes, team reliability, and more.

## Project Structure

```
visualisation-project
├── app
│   ├── __init__.py
│   ├── routes.py
│   ├── static
│   │   ├── css
│   │   │   └── styles.css
│   │   ├── js
│   │   │   └── visualizations.js
│   │   └── d3
│   │       └── d3.min.js
│   └── templates
│       ├── base.html
│       ├── index.html
│       └── visualizations.html
├── data
│   └── sample_data.csv
├── requirements.txt
├── run.py
└── README.md
```

## Visualizations

1. **DNFs Over Time (Line Plot)**: Displays the number of DNFs per year, allowing users to hover over data points for details and apply filters by team, driver, or failure category.

2. **Failure Cause Breakdown (Treemap)**: Visualizes the distribution of failure causes, highlighting the most frequent reasons for DNFs with interactive tooltips and a season dropdown.

3. **Team Reliability Ranking (Stacked Bar)**: Compares DNF counts for each team per season, enabling users to assess reliability and performance through hover stats and filters.

4. **Tyre vs Engine Failure (Grouped Bar)**: Compares failures attributed to tyre and engine issues, allowing toggling between manufacturers and filtering by season.

5. **Driver Experience vs DNFs (Scatter Plot)**: Analyzes the relationship between driver experience and DNF ratios, with hover details and intra-team comparison filters.

6. **Circuit Risk Index (GeoMap area chart)**: Maps race circuits with DNF frequency, using size/color to indicate risk and providing tooltips for circuit details.

7. **Factors Influencing DNFs: Multivariable Analysis (Parallel Coordinate Plot)**: Displays patterns across multiple variables affecting DNFs, with interactive filtering and highlighting options.

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd visualisation-project
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   export FLASK_APP=run.py
   flask run
   ```

4. Open your web browser and navigate to `http://127.0.0.1:5000` to view the application.

## Usage Guidelines

- Explore the various visualizations by navigating through the application.
- Use the interactive features to filter and analyze the data as per your interests.
- Ensure that the sample data is properly formatted in `data/sample_data.csv` for accurate visualizations.

## Acknowledgments

This project utilizes the D3.js library for creating dynamic visualizations and Flask for building the web application.