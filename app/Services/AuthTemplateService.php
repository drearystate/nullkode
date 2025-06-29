<?php namespace App\Services;

use App\Models\Project;

class AuthTemplateService
{
    /**
     * Add authentication system to a project
     */
    public function addAuthSystem(Project $project, array $options = []): bool
    {
        $projectPath = app(ProjectRepository::class)->getProjectPath($project);
        $storage = app('filesystem')->disk('projects');

        // Create auth pages
        $this->createAuthPages($storage, $projectPath, $options);
        
        // Create auth PHP handlers
        $this->createAuthHandlers($storage, $projectPath, $project);
        
        // Create session management
        $this->createSessionManager($storage, $projectPath);
        
        // Update database schema for auth
        $this->addAuthTables($project);

        return true;
    }

    /**
     * Create authentication HTML pages
     */
    private function createAuthPages($storage, $projectPath, $options): void
    {
        $style = $options['style'] ?? 'modern';
        $brandColor = $options['brandColor'] ?? '#007bff';
        
        // Login page
        $loginHtml = $this->generateLoginPage($style, $brandColor);
        $storage->put("$projectPath/login.html", $loginHtml);
        
        // Register page
        $registerHtml = $this->generateRegisterPage($style, $brandColor);
        $storage->put("$projectPath/register.html", $registerHtml);
        
        // Forgot password page
        $forgotHtml = $this->generateForgotPasswordPage($style, $brandColor);
        $storage->put("$projectPath/forgot-password.html", $forgotHtml);
        
        // Dashboard page (protected)
        $dashboardHtml = $this->generateDashboardPage($style, $brandColor);
        $storage->put("$projectPath/dashboard.html", $dashboardHtml);
        
        // Profile page
        $profileHtml = $this->generateProfilePage($style, $brandColor);
        $storage->put("$projectPath/profile.html", $profileHtml);
    }

    /**
     * Create PHP authentication handlers
     */
    private function createAuthHandlers($storage, $projectPath, Project $project): void
    {
        // Main auth handler
        $authPhp = $this->generateAuthHandler($project);
        $storage->put("$projectPath/auth.php", $authPhp);
        
        // Session check include
        $sessionCheck = $this->generateSessionCheck();
        $storage->put("$projectPath/includes/session-check.php", $sessionCheck);
        
        // Logout handler
        $logoutPhp = $this->generateLogoutHandler();
        $storage->put("$projectPath/logout.php", $logoutPhp);
    }

    /**
     * Generate modern login page
     */
    private function generateLoginPage($style, $brandColor): string
    {
        $html = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n";
        $html .= "    <meta charset=\"UTF-8\">\n";
        $html .= "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n";
        $html .= "    <title>Login</title>\n";
        $html .= "    <link href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css\" rel=\"stylesheet\">\n";
        $html .= "    <style>\n";
        $html .= "        :root { --brand-color: $brandColor; }\n";
        $html .= "        body { background: linear-gradient(135deg, var(--brand-color) 0%, #6c5ce7 100%); min-height: 100vh; }\n";
        $html .= "        .auth-card { background: white; border-radius: 15px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); }\n";
        $html .= "        .btn-brand { background-color: var(--brand-color); border-color: var(--brand-color); }\n";
        $html .= "        .text-brand { color: var(--brand-color); }\n";
        $html .= "    </style>\n</head>\n<body>\n";
        
        $html .= "    <div class=\"container-fluid d-flex align-items-center justify-content-center min-vh-100\">\n";
        $html .= "        <div class=\"row w-100\">\n";
        $html .= "            <div class=\"col-md-6 col-lg-4 mx-auto\">\n";
        $html .= "                <div class=\"auth-card p-4\">\n";
        $html .= "                    <div class=\"text-center mb-4\">\n";
        $html .= "                        <h2 class=\"text-brand fw-bold\">Welcome Back</h2>\n";
        $html .= "                        <p class=\"text-muted\">Sign in to your account</p>\n";
        $html .= "                    </div>\n";
        
        $html .= "                    <div id=\"message\" class=\"alert d-none\"></div>\n";
        
        $html .= "                    <form id=\"loginForm\">\n";
        $html .= "                        <div class=\"mb-3\">\n";
        $html .= "                            <label for=\"email\" class=\"form-label\">Email</label>\n";
        $html .= "                            <input type=\"email\" class=\"form-control\" id=\"email\" name=\"email\" required>\n";
        $html .= "                        </div>\n";
        $html .= "                        <div class=\"mb-3\">\n";
        $html .= "                            <label for=\"password\" class=\"form-label\">Password</label>\n";
        $html .= "                            <input type=\"password\" class=\"form-control\" id=\"password\" name=\"password\" required>\n";
        $html .= "                        </div>\n";
        $html .= "                        <div class=\"mb-3 form-check\">\n";
        $html .= "                            <input type=\"checkbox\" class=\"form-check-input\" id=\"remember\" name=\"remember\">\n";
        $html .= "                            <label class=\"form-check-label\" for=\"remember\">Remember me</label>\n";
        $html .= "                        </div>\n";
        $html .= "                        <button type=\"submit\" class=\"btn btn-brand btn-lg w-100 mb-3\">Sign In</button>\n";
        $html .= "                    </form>\n";
        
        $html .= "                    <div class=\"text-center\">\n";
        $html .= "                        <a href=\"forgot-password.html\" class=\"text-muted\">Forgot your password?</a>\n";
        $html .= "                        <hr class=\"my-3\">\n";
        $html .= "                        <p class=\"text-muted\">Don't have an account? <a href=\"register.html\" class=\"text-brand\">Sign up</a></p>\n";
        $html .= "                    </div>\n";
        $html .= "                </div>\n";
        $html .= "            </div>\n";
        $html .= "        </div>\n";
        $html .= "    </div>\n";
        
        $html .= "    <script src=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js\"></script>\n";
        $html .= "    <script>\n";
        $html .= "        document.getElementById('loginForm').addEventListener('submit', async (e) => {\n";
        $html .= "            e.preventDefault();\n";
        $html .= "            const formData = new FormData(e.target);\n";
        $html .= "            try {\n";
        $html .= "                const response = await fetch('auth.php?action=login', {\n";
        $html .= "                    method: 'POST',\n";
        $html .= "                    body: formData\n";
        $html .= "                });\n";
        $html .= "                const result = await response.json();\n";
        $html .= "                if (result.success) {\n";
        $html .= "                    window.location.href = 'dashboard.html';\n";
        $html .= "                } else {\n";
        $html .= "                    showMessage(result.message || 'Login failed', 'danger');\n";
        $html .= "                }\n";
        $html .= "            } catch (error) {\n";
        $html .= "                showMessage('An error occurred', 'danger');\n";
        $html .= "            }\n";
        $html .= "        });\n";
        $html .= "        function showMessage(message, type) {\n";
        $html .= "            const messageDiv = document.getElementById('message');\n";
        $html .= "            messageDiv.className = `alert alert-\${type}`;\n";
        $html .= "            messageDiv.textContent = message;\n";
        $html .= "            messageDiv.classList.remove('d-none');\n";
        $html .= "        }\n";
        $html .= "    </script>\n</body>\n</html>";
        
        return $html;
    }

    /**
     * Generate register page
     */
    private function generateRegisterPage($style, $brandColor): string
    {
        return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n" .
            "<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" .
            "<title>Register</title>\n" .
            "<link href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css\" rel=\"stylesheet\">\n" .
            "<style>:root { --brand-color: $brandColor; }\nbody { background: linear-gradient(135deg, var(--brand-color) 0%, #6c5ce7 100%); min-height: 100vh; }\n.auth-card { background: white; border-radius: 15px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); }\n.btn-brand { background-color: var(--brand-color); border-color: var(--brand-color); }\n.text-brand { color: var(--brand-color); }</style>\n</head>\n<body>\n" .
            "<div class=\"container-fluid d-flex align-items-center justify-content-center min-vh-100\">\n" .
            "<div class=\"row w-100\"><div class=\"col-md-6 col-lg-4 mx-auto\">\n" .
            "<div class=\"auth-card p-4\">\n<div class=\"text-center mb-4\">\n" .
            "<h2 class=\"text-brand fw-bold\">Create Account</h2>\n<p class=\"text-muted\">Join us today</p>\n</div>\n" .
            "<div id=\"message\" class=\"alert d-none\"></div>\n" .
            "<form id=\"registerForm\">\n" .
            "<div class=\"mb-3\"><label for=\"name\" class=\"form-label\">Full Name</label>\n<input type=\"text\" class=\"form-control\" id=\"name\" name=\"name\" required></div>\n" .
            "<div class=\"mb-3\"><label for=\"email\" class=\"form-label\">Email</label>\n<input type=\"email\" class=\"form-control\" id=\"email\" name=\"email\" required></div>\n" .
            "<div class=\"mb-3\"><label for=\"password\" class=\"form-label\">Password</label>\n<input type=\"password\" class=\"form-control\" id=\"password\" name=\"password\" required minlength=\"6\"></div>\n" .
            "<div class=\"mb-3\"><label for=\"confirm_password\" class=\"form-label\">Confirm Password</label>\n<input type=\"password\" class=\"form-control\" id=\"confirm_password\" name=\"confirm_password\" required></div>\n" .
            "<button type=\"submit\" class=\"btn btn-brand btn-lg w-100 mb-3\">Create Account</button>\n</form>\n" .
            "<div class=\"text-center\"><p class=\"text-muted\">Already have an account? <a href=\"login.html\" class=\"text-brand\">Sign in</a></p></div>\n" .
            "</div></div></div></div>\n" .
            "<script src=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js\"></script>\n" .
            "<script>document.getElementById('registerForm').addEventListener('submit', async (e) => { e.preventDefault(); const formData = new FormData(e.target); if (formData.get('password') !== formData.get('confirm_password')) { showMessage('Passwords do not match', 'danger'); return; } try { const response = await fetch('auth.php?action=register', { method: 'POST', body: formData }); const result = await response.json(); if (result.success) { showMessage('Account created successfully! Redirecting...', 'success'); setTimeout(() => window.location.href = 'login.html', 1500); } else { showMessage(result.message || 'Registration failed', 'danger'); } } catch (error) { showMessage('An error occurred', 'danger'); } }); function showMessage(message, type) { const messageDiv = document.getElementById('message'); messageDiv.className = `alert alert-\${type}`; messageDiv.textContent = message; messageDiv.classList.remove('d-none'); }</script>\n</body>\n</html>";
    }

    /**
     * Generate main auth handler PHP
     */
    private function generateAuthHandler(Project $project): string
    {
        return "<?php\nsession_start();\nheader('Content-Type: application/json');\n\n" .
            "try {\n    \$pdo = new PDO('sqlite:database/project.db');\n    \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);\n} catch (PDOException \$e) {\n    echo json_encode(['success' => false, 'message' => 'Database connection failed']);\n    exit;\n}\n\n" .
            "\$action = \$_GET['action'] ?? '';\n\nswitch (\$action) {\n    case 'login':\n        handleLogin(\$pdo);\n        break;\n    case 'register':\n        handleRegister(\$pdo);\n        break;\n    case 'logout':\n        handleLogout();\n        break;\n    case 'check':\n        checkSession();\n        break;\n    default:\n        echo json_encode(['success' => false, 'message' => 'Invalid action']);\n}\n\n" .
            "function handleLogin(\$pdo) {\n    \$email = \$_POST['email'] ?? '';\n    \$password = \$_POST['password'] ?? '';\n    \$remember = isset(\$_POST['remember']);\n\n    if (empty(\$email) || empty(\$password)) {\n        echo json_encode(['success' => false, 'message' => 'Email and password required']);\n        return;\n    }\n\n    try {\n        \$stmt = \$pdo->prepare('SELECT id, name, email, password FROM users WHERE email = ?');\n        \$stmt->execute([\$email]);\n        \$user = \$stmt->fetch(PDO::FETCH_ASSOC);\n\n        if (\$user && password_verify(\$password, \$user['password'])) {\n            \$_SESSION['user_id'] = \$user['id'];\n            \$_SESSION['user_name'] = \$user['name'];\n            \$_SESSION['user_email'] = \$user['email'];\n            \$_SESSION['logged_in'] = true;\n\n            if (\$remember) {\n                \$token = bin2hex(random_bytes(32));\n                setcookie('remember_token', \$token, time() + (30 * 24 * 60 * 60), '/', '', false, true);\n                \$stmt = \$pdo->prepare('UPDATE users SET remember_token = ? WHERE id = ?');\n                \$stmt->execute([\$token, \$user['id']]);\n            }\n\n            echo json_encode(['success' => true, 'message' => 'Login successful']);\n        } else {\n            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);\n        }\n    } catch (PDOException \$e) {\n        echo json_encode(['success' => false, 'message' => 'Database error']);\n    }\n}\n\n" .
            "function handleRegister(\$pdo) {\n    \$name = \$_POST['name'] ?? '';\n    \$email = \$_POST['email'] ?? '';\n    \$password = \$_POST['password'] ?? '';\n\n    if (empty(\$name) || empty(\$email) || empty(\$password)) {\n        echo json_encode(['success' => false, 'message' => 'All fields required']);\n        return;\n    }\n\n    if (strlen(\$password) < 6) {\n        echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);\n        return;\n    }\n\n    try {\n        \$stmt = \$pdo->prepare('SELECT id FROM users WHERE email = ?');\n        \$stmt->execute([\$email]);\n        if (\$stmt->fetch()) {\n            echo json_encode(['success' => false, 'message' => 'Email already registered']);\n            return;\n        }\n\n        \$hashedPassword = password_hash(\$password, PASSWORD_DEFAULT);\n        \$stmt = \$pdo->prepare('INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, ?)');\n        \$stmt->execute([\$name, \$email, \$hashedPassword, date('Y-m-d H:i:s')]);\n\n        echo json_encode(['success' => true, 'message' => 'Account created successfully']);\n    } catch (PDOException \$e) {\n        echo json_encode(['success' => false, 'message' => 'Registration failed']);\n    }\n}\n\n" .
            "function handleLogout() {\n    session_destroy();\n    if (isset(\$_COOKIE['remember_token'])) {\n        setcookie('remember_token', '', time() - 3600, '/');\n    }\n    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);\n}\n\n" .
            "function checkSession() {\n    \$loggedIn = isset(\$_SESSION['logged_in']) && \$_SESSION['logged_in'];\n    echo json_encode([\n        'logged_in' => \$loggedIn,\n        'user' => \$loggedIn ? [\n            'id' => \$_SESSION['user_id'],\n            'name' => \$_SESSION['user_name'],\n            'email' => \$_SESSION['user_email']\n        ] : null\n    ]);\n}\n?>";
    }

    /**
     * Generate forgot password page
     */
    private function generateForgotPasswordPage($style, $brandColor): string
    {
        return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Forgot Password</title>\n" .
            "<link href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css\" rel=\"stylesheet\">\n" .
            "<style>:root { --brand-color: $brandColor; }\nbody { background: linear-gradient(135deg, var(--brand-color) 0%, #6c5ce7 100%); min-height: 100vh; }\n.auth-card { background: white; border-radius: 15px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); }\n.btn-brand { background-color: var(--brand-color); border-color: var(--brand-color); }\n.text-brand { color: var(--brand-color); }</style>\n</head>\n<body>\n" .
            "<div class=\"container-fluid d-flex align-items-center justify-content-center min-vh-100\">\n<div class=\"row w-100\"><div class=\"col-md-6 col-lg-4 mx-auto\">\n" .
            "<div class=\"auth-card p-4\">\n<div class=\"text-center mb-4\">\n<h2 class=\"text-brand fw-bold\">Reset Password</h2>\n<p class=\"text-muted\">Enter your email to receive reset instructions</p>\n</div>\n" .
            "<div id=\"message\" class=\"alert d-none\"></div>\n<form id=\"forgotForm\">\n<div class=\"mb-3\">\n<label for=\"email\" class=\"form-label\">Email Address</label>\n<input type=\"email\" class=\"form-control\" id=\"email\" name=\"email\" required>\n</div>\n" .
            "<button type=\"submit\" class=\"btn btn-brand btn-lg w-100 mb-3\">Send Reset Link</button>\n</form>\n" .
            "<div class=\"text-center\"><a href=\"login.html\" class=\"text-brand\">← Back to Login</a></div>\n</div></div></div></div>\n" .
            "<script src=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js\"></script>\n" .
            "<script>document.getElementById('forgotForm').addEventListener('submit', async (e) => { e.preventDefault(); const formData = new FormData(e.target); try { const response = await fetch('auth.php?action=forgot', { method: 'POST', body: formData }); const result = await response.json(); if (result.success) { showMessage('Reset instructions sent to your email', 'success'); } else { showMessage(result.message || 'Failed to send reset link', 'danger'); } } catch (error) { showMessage('An error occurred', 'danger'); } }); function showMessage(message, type) { const messageDiv = document.getElementById('message'); messageDiv.className = `alert alert-\${type}`; messageDiv.textContent = message; messageDiv.classList.remove('d-none'); }</script>\n</body>\n</html>";
    }

    /**
     * Generate dashboard page
     */
    private function generateDashboardPage($style, $brandColor): string
    {
        return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Dashboard</title>\n" .
            "<link href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css\" rel=\"stylesheet\">\n" .
            "<style>:root { --brand-color: $brandColor; }\n.navbar-brand { color: var(--brand-color) !important; }\n.btn-brand { background-color: var(--brand-color); border-color: var(--brand-color); }\n.text-brand { color: var(--brand-color); }\n.card { border: none; box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075); }</style>\n" .
            "<script>if (!document.cookie.includes('user_session') && !localStorage.getItem('user_logged_in')) { window.location.href = 'login.html'; }</script>\n</head>\n<body>\n" .
            "<nav class=\"navbar navbar-expand-lg navbar-light bg-light\">\n<div class=\"container\">\n<a class=\"navbar-brand fw-bold\" href=\"#\">Dashboard</a>\n" .
            "<div class=\"navbar-nav ms-auto\">\n<span class=\"navbar-text me-3\">Welcome, <span id=\"userName\">User</span>!</span>\n" .
            "<a class=\"nav-link\" href=\"profile.html\">Profile</a>\n<a class=\"nav-link\" href=\"#\" onclick=\"logout()\">Logout</a>\n</div>\n</div>\n</nav>\n" .
            "<div class=\"container mt-4\">\n<div class=\"row\">\n<div class=\"col-md-8\">\n<div class=\"card\">\n<div class=\"card-body\">\n<h5 class=\"card-title\">Welcome to Your Dashboard</h5>\n" .
            "<p class=\"card-text\">This is your personal dashboard. You can customize this page to show the content and features your application needs.</p>\n" .
            "<div class=\"row\">\n<div class=\"col-md-4 mb-3\">\n<div class=\"card bg-primary text-white\">\n<div class=\"card-body text-center\">\n<h4 id=\"userCount\">0</h4>\n<p>Total Users</p>\n</div>\n</div>\n</div>\n" .
            "<div class=\"col-md-4 mb-3\">\n<div class=\"card bg-success text-white\">\n<div class=\"card-body text-center\">\n<h4 id=\"activeCount\">0</h4>\n<p>Active Sessions</p>\n</div>\n</div>\n</div>\n" .
            "<div class=\"col-md-4 mb-3\">\n<div class=\"card bg-info text-white\">\n<div class=\"card-body text-center\">\n<h4 id=\"contentCount\">0</h4>\n<p>Content Items</p>\n</div>\n</div>\n</div>\n</div>\n</div>\n</div>\n</div>\n" .
            "<div class=\"col-md-4\">\n<div class=\"card\">\n<div class=\"card-body\">\n<h5 class=\"card-title\">Quick Actions</h5>\n" .
            "<div class=\"d-grid gap-2\">\n<button class=\"btn btn-brand\">Create New Content</button>\n<button class=\"btn btn-outline-secondary\">Manage Users</button>\n<button class=\"btn btn-outline-secondary\">View Reports</button>\n<button class=\"btn btn-outline-secondary\">Settings</button>\n</div>\n</div>\n</div>\n</div>\n</div>\n</div>\n" .
            "<script src=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js\"></script>\n" .
            "<script>async function loadUserData() { try { const response = await fetch('auth.php?action=check'); const result = await response.json(); if (result.logged_in && result.user) { document.getElementById('userName').textContent = result.user.name; } else { window.location.href = 'login.html'; } } catch (error) { console.error('Error loading user data:', error); } } async function loadStats() { try { const response = await fetch('api.php?action=dashboard_stats'); const result = await response.json(); if (result.success) { document.getElementById('userCount').textContent = result.data.users || 0; document.getElementById('activeCount').textContent = result.data.active_sessions || 0; document.getElementById('contentCount').textContent = result.data.content || 0; } } catch (error) { console.error('Error loading stats:', error); } } async function logout() { try { await fetch('auth.php?action=logout'); localStorage.removeItem('user_logged_in'); window.location.href = 'login.html'; } catch (error) { window.location.href = 'login.html'; } } loadUserData(); loadStats();</script>\n</body>\n</html>";
    }

    /**
     * Generate profile page
     */
    private function generateProfilePage($style, $brandColor): string
    {
        return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Profile</title>\n" .
            "<link href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css\" rel=\"stylesheet\">\n" .
            "<style>:root { --brand-color: $brandColor; }\n.navbar-brand { color: var(--brand-color) !important; }\n.btn-brand { background-color: var(--brand-color); border-color: var(--brand-color); }\n.text-brand { color: var(--brand-color); }\n.card { border: none; box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075); }</style>\n" .
            "<script>if (!document.cookie.includes('user_session') && !localStorage.getItem('user_logged_in')) { window.location.href = 'login.html'; }</script>\n</head>\n<body>\n" .
            "<nav class=\"navbar navbar-expand-lg navbar-light bg-light\">\n<div class=\"container\">\n<a class=\"navbar-brand fw-bold\" href=\"dashboard.html\">Dashboard</a>\n" .
            "<div class=\"navbar-nav ms-auto\">\n<a class=\"nav-link\" href=\"dashboard.html\">Dashboard</a>\n<a class=\"nav-link active\" href=\"profile.html\">Profile</a>\n<a class=\"nav-link\" href=\"#\" onclick=\"logout()\">Logout</a>\n</div>\n</div>\n</nav>\n" .
            "<div class=\"container mt-4\">\n<div class=\"row\">\n<div class=\"col-md-8 mx-auto\">\n<div class=\"card\">\n<div class=\"card-body\">\n<h5 class=\"card-title\">Profile Settings</h5>\n" .
            "<div id=\"message\" class=\"alert d-none\"></div>\n<form id=\"profileForm\">\n<div class=\"mb-3\">\n<label for=\"name\" class=\"form-label\">Full Name</label>\n<input type=\"text\" class=\"form-control\" id=\"name\" name=\"name\" required>\n</div>\n" .
            "<div class=\"mb-3\">\n<label for=\"email\" class=\"form-label\">Email</label>\n<input type=\"email\" class=\"form-control\" id=\"email\" name=\"email\" required readonly>\n</div>\n" .
            "<hr>\n<h6>Change Password</h6>\n<div class=\"mb-3\">\n<label for=\"current_password\" class=\"form-label\">Current Password</label>\n<input type=\"password\" class=\"form-control\" id=\"current_password\" name=\"current_password\">\n</div>\n" .
            "<div class=\"mb-3\">\n<label for=\"new_password\" class=\"form-label\">New Password</label>\n<input type=\"password\" class=\"form-control\" id=\"new_password\" name=\"new_password\">\n</div>\n" .
            "<div class=\"mb-3\">\n<label for=\"confirm_password\" class=\"form-label\">Confirm New Password</label>\n<input type=\"password\" class=\"form-control\" id=\"confirm_password\" name=\"confirm_password\">\n</div>\n" .
            "<button type=\"submit\" class=\"btn btn-brand\">Update Profile</button>\n</form>\n</div>\n</div>\n</div>\n</div>\n</div>\n" .
            "<script src=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js\"></script>\n" .
            "<script>async function loadProfile() { try { const response = await fetch('auth.php?action=check'); const result = await response.json(); if (result.logged_in && result.user) { document.getElementById('name').value = result.user.name; document.getElementById('email').value = result.user.email; } else { window.location.href = 'login.html'; } } catch (error) { console.error('Error loading profile:', error); } } document.getElementById('profileForm').addEventListener('submit', async (e) => { e.preventDefault(); const formData = new FormData(e.target); const newPassword = formData.get('new_password'); const confirmPassword = formData.get('confirm_password'); if (newPassword && newPassword !== confirmPassword) { showMessage('New passwords do not match', 'danger'); return; } try { const response = await fetch('auth.php?action=update_profile', { method: 'POST', body: formData }); const result = await response.json(); if (result.success) { showMessage('Profile updated successfully', 'success'); } else { showMessage(result.message || 'Update failed', 'danger'); } } catch (error) { showMessage('An error occurred', 'danger'); } }); async function logout() { try { await fetch('auth.php?action=logout'); localStorage.removeItem('user_logged_in'); window.location.href = 'login.html'; } catch (error) { window.location.href = 'login.html'; } } function showMessage(message, type) { const messageDiv = document.getElementById('message'); messageDiv.className = `alert alert-\${type}`; messageDiv.textContent = message; messageDiv.classList.remove('d-none'); } loadProfile();</script>\n</body>\n</html>";
    }

    /**
     * Generate session check include
     */
    private function generateSessionCheck(): string
    {
        return "<?php\n// Session check include\n// Include this file at the top of protected pages\n\nsession_start();\n\n" .
            "// Check if user is logged in\nif (!isset(\$_SESSION['logged_in']) || !\$_SESSION['logged_in']) {\n    // Check for remember me cookie\n    if (isset(\$_COOKIE['remember_token'])) {\n        try {\n            \$pdo = new PDO('sqlite:database/project.db');\n            \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);\n            \n            \$stmt = \$pdo->prepare('SELECT id, name, email FROM users WHERE remember_token = ? AND remember_token IS NOT NULL');\n            \$stmt->execute([\$_COOKIE['remember_token']]);\n            \$user = \$stmt->fetch(PDO::FETCH_ASSOC);\n            \n            if (\$user) {\n                // Re-establish session\n                \$_SESSION['user_id'] = \$user['id'];\n                \$_SESSION['user_name'] = \$user['name'];\n                \$_SESSION['user_email'] = \$user['email'];\n                \$_SESSION['logged_in'] = true;\n            } else {\n                // Invalid token, redirect to login\n                header('Location: login.html');\n                exit;\n            }\n        } catch (PDOException \$e) {\n            // Database error, redirect to login\n            header('Location: login.html');\n            exit;\n        }\n    } else {\n        // No session and no remember token, redirect to login\n        header('Location: login.html');\n        exit;\n    }\n}\n\n// Update last activity\ntry {\n    \$pdo = new PDO('sqlite:database/project.db');\n    \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);\n    \n    \$stmt = \$pdo->prepare('UPDATE users SET last_login = ? WHERE id = ?');\n    \$stmt->execute([date('Y-m-d H:i:s'), \$_SESSION['user_id']]);\n} catch (PDOException \$e) {\n    // Ignore database errors for activity updates\n}\n\n// Regenerate session ID periodically for security\nif (!isset(\$_SESSION['last_regeneration']) || time() - \$_SESSION['last_regeneration'] > 300) {\n    session_regenerate_id(true);\n    \$_SESSION['last_regeneration'] = time();\n}\n\n?>";
    }

    /**
     * Generate logout handler
     */
    private function generateLogoutHandler(): string
    {
        return "<?php\nsession_start();\n\n// Clear remember token from database if exists\nif (isset(\$_SESSION['user_id'])) {\n    try {\n        \$pdo = new PDO('sqlite:database/project.db');\n        \$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);\n        \n        \$stmt = \$pdo->prepare('UPDATE users SET remember_token = NULL WHERE id = ?');\n        \$stmt->execute([\$_SESSION['user_id']]);\n    } catch (PDOException \$e) {\n        // Ignore database errors during logout\n    }\n}\n\n// Destroy session\nsession_destroy();\n\n// Clear remember me cookie\nif (isset(\$_COOKIE['remember_token'])) {\n    setcookie('remember_token', '', time() - 3600, '/');\n}\n\n// Redirect to login\nheader('Location: login.html');\nexit;\n?>";
    }

    /**
     * Create session management files
     */
    private function createSessionManager($storage, $projectPath): void
    {
        // Create includes directory if it doesn't exist
        $includesPath = "$projectPath/includes";
        if (!$storage->exists($includesPath)) {
            $storage->makeDirectory($includesPath);
        }
    }

    /**
     * Add authentication tables to existing database
     */
    private function addAuthTables(Project $project): void
    {
        try {
            $pdo = app(ProjectDatabaseService::class)->getConnection($project);
            
            // Check if auth tables already exist
            $stmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions'");
            if ($stmt->fetch()) {
                return; // Auth tables already exist
            }

            // Add indexes for better performance
            $authIndexes = [
                "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
                "CREATE INDEX IF NOT EXISTS idx_users_remember_token ON users(remember_token)",
                "CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email)",
                "CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)",
                "CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity)"
            ];

            foreach ($authIndexes as $sql) {
                $pdo->exec($sql);
            }

        } catch (\Exception $e) {
            // Tables might already exist or database might not be ready
        }
    }
} 