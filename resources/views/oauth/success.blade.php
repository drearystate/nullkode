<!DOCTYPE html>
<html>
<head>
    <title>OAuth Success</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
        .message { font-size: 18px; margin-bottom: 30px; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="success">✅ Connection Successful!</div>
    <div class="message">{{ $message }}</div>
    <button onclick="window.close()">Close Window</button>
    
    <script>
        // Auto-close after 3 seconds
        setTimeout(() => {
            window.close();
        }, 3000);
    </script>
</body>
</html> 