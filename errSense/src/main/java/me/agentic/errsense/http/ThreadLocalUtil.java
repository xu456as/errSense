package me.agentic.errsense.http;

import java.util.HashMap;
import java.util.Map;

public class ThreadLocalUtil {

    private static final ThreadLocal<Map<String, String>> headerContext = ThreadLocal.withInitial(HashMap::new);

    private ThreadLocalUtil() {
    }

    public static void setHeader(String key, String value) {
        headerContext.get().put(key, value);
    }

    public static String getHeader(String key) {
        return headerContext.get().get(key);
    }

    public static Map<String, String> getAllHeaders() {
        return new HashMap<>(headerContext.get());
    }

    public static void setHeaders(Map<String, String> headers) {
        headerContext.get().putAll(headers);
    }

    public static void removeHeader(String key) {
        headerContext.get().remove(key);
    }

    public static void clear() {
        headerContext.remove();
    }
}