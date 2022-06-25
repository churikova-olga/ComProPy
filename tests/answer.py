import os
import shutil

import importlib

"""
Здесь будет производиться вызов функции-чекера для проверки присланных решений.
Особенности:
1) Нет докеризации (пока что). НЕБЕЗОПАСНО!
2) Проверка по времени исполнения
3) Проверка по памяти
4) Проверка корректности на данных тестах
"""

TESTING_DIR = 'testingDirectory'
SUCCESS_STATUS = 'SUCCESS'

def execute(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    foo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(foo)


def checker(inputs, outputs, solution, slug, MEDIA_ROOT):

    inputs = str(inputs)
    outputs = str(outputs)
    solution = str(solution)
    slug = str(slug)
    testing_directory = os.path.join(MEDIA_ROOT, TESTING_DIR, slug)
    os.mkdir(testing_directory)


    with open(os.path.join(MEDIA_ROOT, inputs), 'r') as inputs_file_initial:
        input_data = inputs_file_initial.read().split('\n\n\n')

    with open(os.path.join(MEDIA_ROOT, outputs), 'r') as outputs_file_initial:
        output_data = outputs_file_initial.read().split('\n\n\n')

    if len(input_data) != len(output_data):
        return "Ошибка: количество входов-тестов и выходов-тестов не совпадает!"


    _, solution_name = os.path.split(solution)
    new_solution_path = os.path.join(testing_directory, solution_name)
    shutil.copy(os.path.join(MEDIA_ROOT, solution), testing_directory)
    CUR_DIR = os.path.abspath(os.getcwd())
    os.chdir(testing_directory)
    for idx in range(len(input_data)):
        with open('input.txt', 'w') as testing_input_file:
            testing_input_file.write(input_data[idx])
        try:
            execute(solution_name, new_solution_path)
            with open('output.txt', 'r') as testing_output_file:
                if output_data[idx] != testing_output_file.read():
                    raise Exception('Wrong answer')
        except Exception as e:
            os.chdir(CUR_DIR)
            shutil.rmtree(testing_directory)
            return f'ERROR! test {idx+1} failure: {e.args[0]}.'


    os.chdir(CUR_DIR)
    shutil.rmtree(testing_directory)
    return SUCCESS_STATUS

import sys
print(checker(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]))
