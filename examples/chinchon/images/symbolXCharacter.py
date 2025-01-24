import os

def rename_card_files():
    replacements = {
        '♠️': 'spades',
        '♥️': 'hearts',
        '♦️': 'diamonds',
        '♣️': 'clubs'
    }
    
    for filename in os.listdir('.'):
        if filename.endswith('.webp'):
            new_name = filename
            for symbol, word in replacements.items():
                if symbol in filename:
                    new_name = new_name.replace(symbol, '_' + word)
            
            if new_name != filename:
                os.rename(filename, new_name)
                print(f'Renombrado: {filename} -> {new_name}')

if __name__ == '__main__':
    rename_card_files()
