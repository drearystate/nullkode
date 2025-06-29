<!DOCTYPE html>
<html>
<head>
    <title>OAuth Error</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
        .message { font-size: 18px; margin-bottom: 30px; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="error">❌ Connection Failed</div>
    <div class="message">Failed to connect to {{ ucfirst($provider) }}: {{ $error }}</div>
    <button onclick="window.close()">Close Window</button>
    
    <script>
        // Auto-close after 5 seconds
        setTimeout(() => {
            window.close();
        }, 5000);
    </script>
</body>
</html> 