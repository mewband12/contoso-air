def calculate(first, operator, second):
    if operator == "+":
        return first + second
    if operator == "-":
        return first - second
    if operator == "*":
        return first * second
    if operator == "/":
        return first / second
    raise ValueError(f"Unsupported operator: {operator}")


def main():
    try:
        first = float(input("First number: "))
        operator = input("Operator (+, -, *, /): ")
        second = float(input("Second number: "))
        print(calculate(first, operator, second))
    except (ValueError, ZeroDivisionError) as error:
        print(f"Error: {error}")


if __name__ == "__main__":
    main()
