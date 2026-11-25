"""Errors raised by the domain. The API layer maps `code` to a stable error envelope."""

from __future__ import annotations


class DomainError(ValueError):
    """Base class for every error the domain raises on purpose."""

    code = "domain_error"


class InvalidInput(DomainError):
    """A value is out of the range the rules allow."""

    code = "invalid_input"


class UnknownId(DomainError):
    """An identifier does not exist in its catalog."""

    code = "unknown_id"


class DataError(DomainError):
    """A data file under data/ is missing or does not have the expected shape."""

    code = "data_error"
