# Leazo-Backend
400 Bad Request: The server cannot process the request due to client error (e.g., malformed request syntax or invalid parameters).
401 Unauthorized: Authentication is required and has failed or has not been provided.
403 Forbidden: The client does not have permission to access the resource, even if authenticated.
404 Not Found: The requested resource could not be found on the server.
405 Method Not Allowed: The HTTP method is not supported for the requested resource (e.g., trying to use PUT on a resource that only accepts GET).
409 Conflict: Indicates a conflict in the request (e.g., when trying to create a resource that already exists).
422 Unprocessable Entity: The server understands the request, but the content was invalid (common in validation failures).
429 Too Many Requests: The user has sent too many requests in a given amount of time ("rate limiting").
Todos:

1.Introduce API versions.
