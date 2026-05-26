# The extension should instantly flag the mutable default argument 
# and the missing parentheses for print.
def process_data(items=None):
    if items is None:
        items = []
    print("Processing items...")
    items.append("new item")
    return items
