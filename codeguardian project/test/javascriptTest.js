// CodeGuardian AI - JavaScript / TypeScript Testing Suite

// 1. var-usage & loose-equality
var status = "200";
if (status == 200) {
    // 2. console-log
    console.log("Status is OK");
}

async function fetchUser() {
    // 3. missing-await & unhandled-promise
    const response = fetch("https://api.example.com/user");
    
    try {
        const data = await response.json();
        
        // 4. innerHTML XSS & null-comparison
        if (data != null) {
            document.getElementById("greeting").innerHTML = "<p>Hello " + data.name + "</p>";
        }
        
    } catch (e) {
        // 5. empty-catch
    }
}

function calculateDiscount(price) {
    // 6. magic-number & nested-ternary
    const discount = price > 100 ? (price > 500 ? 0.2 : 0.1) : 0;
    return price - (price * discount);
}

// 7. eval-usage
function parseDynamicInput(inputString) {
    return eval(inputString);
}

// 8. uncleared-interval
function startPolling() {
    setInterval(() => fetchUser(), 5000);
}

// 9. debugger-statement
function processCriticalLogic() {
    debugger;
    return true;
}

// 10. unused-variable
function dummyFunction() {
    const neverUsed = "secret";
    return 42;
}
