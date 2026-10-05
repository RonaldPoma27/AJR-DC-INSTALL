from django.core.exceptions import ValidationError

MIN_LENGTH, MAX_LENGTH = 7, 24


class StrongPasswordValidator:
    """7–24 caracteres, con al menos una mayúscula, una minúscula, un número y un carácter especial."""

    def validate(self, password, user=None):
        errors = []
        if not (MIN_LENGTH <= len(password) <= MAX_LENGTH):
            errors.append(f"Debe tener entre {MIN_LENGTH} y {MAX_LENGTH} caracteres.")
        if not any(c.isupper() for c in password):
            errors.append("Debe incluir al menos una mayúscula.")
        if not any(c.islower() for c in password):
            errors.append("Debe incluir al menos una minúscula.")
        if not any(c.isdigit() for c in password):
            errors.append("Debe incluir al menos un número.")
        if not any(not c.isalnum() and not c.isspace() for c in password):
            errors.append("Debe incluir al menos un carácter especial (por ejemplo ! @ # $ %).")
        if errors:
            raise ValidationError(errors, code="password_policy")

    def get_help_text(self):
        return (
            f"Entre {MIN_LENGTH} y {MAX_LENGTH} caracteres, con mayúscula, minúscula, número y carácter especial."
        )
