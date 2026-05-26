FROM alpine:latest

WORKDIR /app

COPY . .

RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'echo "Hello from Error Sense repository!"' >> /entrypoint.sh && \
    echo 'echo "Repository contents:"' >> /entrypoint.sh && \
    echo 'find /app -type f | head -20' >> /entrypoint.sh && \
    echo 'echo ""' >> /entrypoint.sh && \
    echo 'echo "Container is running. Press Ctrl+C to stop."' >> /entrypoint.sh && \
    echo 'tail -f /dev/null' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]