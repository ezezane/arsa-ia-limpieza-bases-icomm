import pandas as pd
import json

try:
    df = pd.read_csv('c:\\wamp64\\www\\arsa-ia-limpieza-bases-icomm\\uploads\\Clientes Banco Macro.csv', sep=';', usecols=['CLI_ES_HVC'], nrows=10)
    # Replace NaN with None for JSON serialization
    df = df.fillna(value=pd.NA).replace({pd.NA: None})
    print(json.dumps(df.to_dict(orient='records')))
except Exception as e:
    print(f"Error: {e}")