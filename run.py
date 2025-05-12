from app import create_app
import pandas as pd
import os
from dotenv import load_dotenv
from flask import jsonify

# Load environment variables
load_dotenv()

# Initialize Flask app
app = create_app()

# Global data storage
app.config['DATASETS'] = {}
def load_datasets():
    global grand_prix_counts
    """Load all required datasets"""
    try:
        races_race_df = pd.read_csv('app/static/data/races-race-results.csv')
   
        # Delete rows where reasonRetired is empty
        races_race_df = races_race_df.dropna(subset=['reasonRetired'])
        
        # Select the bottom 100 rows
        bottom_1000 = races_race_df[(races_race_df['year'] >= 2009) & (races_race_df['year'] <= 2025)]

        
        # Delete columns with any empty values
        bottom_1000.dropna(axis=1, how='any', inplace=True)
        
        races_df = pd.read_csv('app/static/data/races.csv')
        # Merge the two dataframes based on the 'circuitId' column
        bottom_1000 = pd.merge(bottom_1000, races_df[['raceId', 'circuitId', 'grandPrixId']], on='raceId', how='left')
        filtered_races = races_df[(races_df['year'] >= 2009) & (races_df['year'] <= 2025)]

        grand_prix_counts = filtered_races['grandPrixId'].value_counts().reset_index()
        grand_prix_counts.columns = ['grandPrixId', 'raceCount']

        circuits_df = pd.read_csv('app/static/data/circuits.csv')
        # Merge the two dataframes based on the 'circuitId' column
        bottom_1000 = pd.merge(bottom_1000, circuits_df[['circuitId', 'latitude', 'longitude', 'type']], on='circuitId', how='left')
        
        # Save the processed data
        output_path = 'app/static/data/sampled.csv'
        bottom_1000.to_csv(output_path, index=False)
        print(f"Data saved successfully to {output_path}")
        print("\nFirst few rows of the saved data:")
        print(bottom_1000.head())
        
        # Store the processed data in app config
        app.config['DATASETS']['circuit_data'] = bottom_1000.to_dict('records')
        app.config['DATASETS']['grand_prix_counts'] = grand_prix_counts.set_index('grandPrixId').to_dict()['raceCount']
       
    except Exception as e:
        print(f"Error loading datasets: {str(e)}")

    
@app.route('/api/circuit-data', methods=['POST'])
def get_circuit_data():
    """Endpoint to get processed circuit data"""
    try:
        # Process the data to calculate DNF frequencies and circuit information
        circuit_data = app.config['DATASETS'].get('circuit_data', [])
        grand_prix_counts = app.config['DATASETS'].get('grand_prix_counts', {})
        # Process the data to calculate statistics
        circuits_by_location = {}
        
        for d in circuit_data:
            circuit_id = d['circuitId']
            if circuit_id not in circuits_by_location:
                circuits_by_location[circuit_id] = {
                    'circuitId': circuit_id,
                    'circuitName': d.get('circuitName', circuit_id),
                    'lat': float(d['latitude']),
                    'lng': float(d['longitude']),
                    'country': d['grandPrixId'],
                    'circuitType': d.get('type', 'Unknown'),
                    'totalRaces': 0,
                    'dnfCount': 0,
                    'dnfReasons': {}
                }
            
            circuits_by_location[circuit_id]['totalRaces'] += 1
            
            if d.get('positionText') == 'DNF' and d.get('reasonRetired'):
                circuits_by_location[circuit_id]['dnfCount'] += 1
                reason = d['reasonRetired']
                circuits_by_location[circuit_id]['dnfReasons'][reason] = \
                    circuits_by_location[circuit_id]['dnfReasons'].get(reason, 0) + 1
        
        # Calculate DNF percentages and top reasons
        processed_circuits = []
        for circuit in circuits_by_location.values():
            circuit['dnfPercentage'] = (circuit['dnfCount'] / (grand_prix_counts[circuit['country']]*20) * 100) if circuit['totalRaces'] > 0 else 0
            circuit['topReasons'] = sorted(
                [(reason, count) for reason, count in circuit['dnfReasons'].items()],
                key=lambda x: x[1],
                reverse=True
            )[:3]
            processed_circuits.append(circuit)
        
        return jsonify({
            'status': 'success',
            'data': processed_circuits
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# Load data and setup configurations before running the app
with app.app_context():
    load_datasets()
    pass

if __name__ == '__main__':
    app.run(debug=True)
    # load_datasets()
