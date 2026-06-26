import time

from config import EXTERNAL_REQUEST_BACKOFF_SECONDS, EXTERNAL_REQUEST_RETRIES


def retry_with_backoff(operation, retries=EXTERNAL_REQUEST_RETRIES, base_delay=EXTERNAL_REQUEST_BACKOFF_SECONDS):
    last_error = None
    for attempt in range(retries + 1):
        try:
            return operation()
        except Exception as error:
            last_error = error
            if attempt >= retries:
                break
            time.sleep(base_delay * (2 ** attempt))
    raise last_error
