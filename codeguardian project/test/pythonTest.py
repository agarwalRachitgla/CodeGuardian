# CodeGuardian AI - Python Testing Suite

# 1. py-mutable-default
def append_to_list(value, my_list=[]):
    my_list.append(value)
    return my_list

# 2. py-equality-none & py-print-statement
def check_status(user):
    if user == None:
        print "User is missing" # missing parentheses (py3)
        return False
    return True

# 3. py-bare-except & py-pass-except
def load_config():
    try:
        data = open("config.json").read()
    except:
        pass

# 4. py-global-keyword
user_count = 0
def increment_user():
    global user_count
    user_count += 1

# 5. py-eval & py-exec (Security)
def execute_dynamic_code(code_string):
    eval(code_string)
    exec(code_string)

# 6. py-hardcoded-password
def connect_db():
    connection_string = "mysql://admin:superSecret123@localhost/db"
    return connection_string

# 7. py-breakpoint
def debug_loop():
    for i in range(10):
        breakpoint()

# 8. py-star-import
from math import *

def math_logic():
    return sqrt(25) + cos(0)
