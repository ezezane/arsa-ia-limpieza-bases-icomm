
import pandas as pd

# Define paths
examples_path = "c:/wamp64/www/arsa-ia-limpieza-bases-icomm/examples/2244_1_BD_S_Clientes_País_ARGENTINA_20251103202111.csv"
bancos_path = "c:/wamp64/www/arsa-ia-limpieza-bases-icomm/config/bancos_conocidos.txt"
tarjetas_path = "c:/wamp64/www/arsa-ia-limpieza-bases-icomm/config/tarjetas_conocidas.txt"

# Read the CSV
df = pd.read_csv(examples_path)

# Get unique values
bancos_unicos = df['EMIS_BANCOS'].unique()
tarjetas_unicas = df['EMIS_TARJETAS'].unique()

# Write to files
with open(bancos_path, 'w') as f:
    for banco in bancos_unicos:
        f.write(f"{banco}\n")

with open(tarjetas_path, 'w') as f:
    for tarjeta in tarjetas_unicas:
        f.write(f"{tarjeta}\n")

print("Archivos de configuración actualizados con éxito.")

