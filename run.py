from app import create_app
import pandas as pd
import os
from dotenv import load_dotenv
from flask import jsonify, request

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
        bottom_1000 = races_race_df[(races_race_df['year'] >= 2015) & (races_race_df['year'] <= 2025)]


        
        # Delete columns with any empty values
        bottom_1000.dropna(axis=1, how='any', inplace=True)
        
        races_df = pd.read_csv('app/static/data/races.csv')
        # Merge the two dataframes based on the 'circuitId' column
        bottom_1000 = pd.merge(bottom_1000, races_df[['raceId', 'circuitId', 'grandPrixId']], on='raceId', how='left')
        filtered_races = races_df[(races_df['year'] >= 2015) & (races_df['year'] <= 2025)]

        grand_prix_counts = filtered_races['grandPrixId'].value_counts().reset_index()
        grand_prix_counts.columns = ['grandPrixId', 'raceCount']

        circuits_df = pd.read_csv('app/static/data/circuits.csv')
        # Merge the two dataframes based on the 'circuitId' column
        bottom_1000 = pd.merge(bottom_1000, circuits_df[['circuitId', 'latitude', 'longitude', 'type','countryId']], on='circuitId', how='left')
        
        drivers_df = pd.read_csv('app/static/data/f1db-drivers.csv')
        # Merge the two dataframes based on the 'circuitId' column
        bottom_1000 = pd.merge(bottom_1000, drivers_df[['driverId', 'totalRaceStarts']], on='driverId', how='left')

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
                    'country': d['countryId'],
                    'grandPrixId': d['grandPrixId'],
                    'circuitType': d.get('type', 'Unknown'),
                    'totalRaces': 0,
                    'dnfCount': 0,
                    'dnfReasons': {}
                }
            
            circuits_by_location[circuit_id]['totalRaces'] += 1
            
            if d.get('reasonRetired'):
                circuits_by_location[circuit_id]['dnfCount'] += 1
                reason = d['reasonRetired']
                circuits_by_location[circuit_id]['dnfReasons'][reason] = \
                    circuits_by_location[circuit_id]['dnfReasons'].get(reason, 0) + 1
        
        # Calculate DNF percentages and top reasons
        processed_circuits = []
        for circuit in circuits_by_location.values():
            # circuit['dnfPercentage'] = (circuit['dnfCount'] / (grand_prix_counts[circuit['grandPrixId']]*20) * 100) if circuit['totalRaces'] > 0 else 0
            if circuit['country'] in grand_prix_counts:
                circuit['dnfPercentage'] = (circuit['dnfCount'] / (grand_prix_counts[circuit['grandPrixId']]*20) * 100) if circuit['totalRaces'] > 0 else 0
            else:
                # Default to using totalRaces if the grandPrixId is not found in grand_prix_counts
                circuit['dnfPercentage'] = (circuit['dnfCount'] / circuit['totalRaces'] * 100) if circuit['totalRaces'] > 0 else 0
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
    

@app.route('/api/pcp-data', methods=['GET'])
def get_pcp_data():
    """Endpoint to get data for Parallel Coordinates Plot"""
    try:
        circuit_data = app.config['DATASETS'].get('circuit_data', [])
        
        # Process data for PCP
        pcp_data = []
        for d in circuit_data:
            entry = {
                'year': int(d['year']),
                'circuitName': d.get('circuitId', 'Unknown'),
                'circuitType': d.get('type', 'Unknown'),
                'grid': int(d['gridPositionNumber']),
                'laps': int(d['laps']),
                'reasonRetired': d.get('reasonRetired', 'Unknown'),
                'constructor': d.get('constructorId', 'Unknown'),
                'engine': d.get('engineManufacturerId', 'Unknown'),
                'tyre': d.get('tyreManufacturerId', 'Unknown'),
                'country': d.get('countryId', 'Unknown'),
            }
            pcp_data.append(entry)
        
        return jsonify({
            'status': 'success',
            'data': pcp_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/failure-cause-breakdown', methods=['GET'])
def get_failure_cause_breakdown():
    """Endpoint to get data for Failure Cause Breakdown visualization"""
    try:
        circuit_data = app.config['DATASETS'].get('circuit_data', [])
        
        # Get season and circuitId filter from query parameters
        season = request.args.get('season')
        circuit_id = request.args.get('circuitId')
        
        # Filter data by season if specified
        if season and season != 'all':
            circuit_data = [d for d in circuit_data if str(d['year']) == season]
        # Filter data by circuitId if specified
        if circuit_id and circuit_id != 'all':
            circuit_data = [d for d in circuit_data if str(d['circuitId']) == circuit_id]
        
        # Group data by failure reason
        failure_counts = {}
        for d in circuit_data:
            reason = d.get('reasonRetired')
            if reason and reason.strip():
                failure_counts[reason] = failure_counts.get(reason, 0) + 1
        
        # Convert to list and sort by count
        reasons_data = [{'reason': reason, 'count': count} 
                       for reason, count in failure_counts.items()]
        reasons_data.sort(key=lambda x: x['count'], reverse=True)
        
        # Calculate total and percentages
        total = sum(d['count'] for d in reasons_data)
        for d in reasons_data:
            d['percentage'] = round((d['count'] / total * 100), 1) if total > 0 else 0
        
        return jsonify({
            'status': 'success',
            'data': reasons_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/team-reliability', methods=['POST'])
def get_team_reliability():
    """Endpoint to get team reliability data for visualization"""
    try:
        circuit_data = app.config['DATASETS'].get('circuit_data', [])
        
        # Get filters from request body
        filters = request.json.get('filters', {})
        season = filters.get('season')
        team = filters.get('team')
        selected_years = filters.get('selectedYears', ["2020", "2021", "2022", "2023", "2024"])
        limit = filters.get('limit', 10)
        
        # Filter data based on parameters
        if season and season != 'all':
            circuit_data = [d for d in circuit_data if str(d['year']) == season]
        if team and team != 'all':
            circuit_data = [d for d in circuit_data if d['constructorId'] == team]
            
        # Count DNFs by constructor and year
        dnfs_by_team_and_year = {}
        for d in circuit_data:
            team = d['constructorId']
            year = str(d['year'])
            if year in selected_years:
                if team not in dnfs_by_team_and_year:
                    dnfs_by_team_and_year[team] = {year: 0 for year in selected_years}
                dnfs_by_team_and_year[team][year] = dnfs_by_team_and_year[team].get(year, 0) + 1
        
        # Convert to array format and calculate totals
        team_data = []
        for team, year_data in dnfs_by_team_and_year.items():
            total = sum(year_data.values())
            avg_dnfs = total / len(selected_years)
            team_data.append({
                'team': team,
                **year_data,
                'total': total,
                'avgDNFsPerYear': round(avg_dnfs, 1)
            })
        
        # Sort by total DNFs and limit results
        team_data.sort(key=lambda x: x['total'], reverse=True)
        team_data = team_data[:limit]
        
        # Calculate statistics
        total_dnfs = sum(d['total'] for d in team_data)
        avg_dnfs_per_team = round(total_dnfs / len(team_data), 1) if team_data else 0
        
        return jsonify({
            'status': 'success',
            'data': {
                'teams': team_data,
                'statistics': {
                    'totalDNFs': total_dnfs,
                    'avgDNFsPerTeam': avg_dnfs_per_team,
                    'totalTeams': len(team_data),
                    'years': selected_years
                }
            }
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
