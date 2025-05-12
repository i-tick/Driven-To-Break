import pandas as pd
import os

def process_race_results():
    """
    Read the races-race-results.csv file and change the tyreManufacturerId to 'bridgestone'
    for all rows from the year 2015.
    """
    # Define the file path
    file_path = os.path.join('app', 'static', 'data', 'races-race-results.csv')
    
    try:
        # Read the CSV file
        df = pd.read_csv(file_path)
        
        # Update tyreManufacturerId to 'bridgestone' for rows where year is 2015
        df.loc[df['year'] == 2015, 'tyreManufacturerId'] = 'bridgestone'
        
        # Save the updated dataframe back to the CSV file
        df.to_csv(file_path, index=False)
        
        print(f"Successfully updated tyreManufacturerId to 'bridgestone' for 2015 races.")
        return True
    except Exception as e:
        print(f"Error processing race results: {str(e)}")
        return False

if __name__ == "__main__":
    process_race_results()
