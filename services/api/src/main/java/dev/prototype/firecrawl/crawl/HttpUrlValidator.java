package dev.prototype.firecrawl.crawl;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.net.URI;
import java.net.URISyntaxException;

public class HttpUrlValidator implements ConstraintValidator<ValidHttpUrl, String> {
  @Override
  public boolean isValid(String value, ConstraintValidatorContext context) {
    if (value == null || value.isBlank()) {
      return true;
    }
    try {
      URI uri = new URI(value);
      boolean http =
          "http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme());
      int port = uri.getPort();
      return http
          && !uri.isOpaque()
          && uri.getHost() != null
          && !uri.getHost().isBlank()
          && uri.getRawUserInfo() == null
          && uri.getRawFragment() == null
          && (port == -1 || (port >= 1 && port <= 65535));
    } catch (URISyntaxException exception) {
      return false;
    }
  }
}
