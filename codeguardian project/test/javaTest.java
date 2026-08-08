public class JavaTest {

    // 1. java-empty-catch & java-raw-type
    public void processItems(java.util.List items) {
        try {
            for(int i=0; i<items.size(); i++) {
                System.out.println(items.get(i));
            }
        } catch (Exception e) {
            
        }
    }

    // 2. java-string-equals & java-sysout
    public void compareNames(String name) {
        if (name == "Admin") {
            System.out.println("Welcome Admin!");
        }
    }

    // 3. java-syserr & java-return-null
    public String loadConfiguration() {
        if (!new java.io.File("config.json").exists()) {
            System.err.println("Config not found!");
            return null;
        }
        return "Config Data";
    }

    // 4. java-concatenation-loop
    public String buildReport(String[] sections) {
        String report = "";
        for (String section : sections) {
            report = report + section + "\n";
        }
        return report;
    }

    // 5. java-thread-sleep & java-hardcoded-string (security)
    public void executeBackgroundTasks() throws InterruptedException {
        String dbPass = "admin123";
        Thread.sleep(5000);
        System.out.println("Connected with " + dbPass);
    }
}
