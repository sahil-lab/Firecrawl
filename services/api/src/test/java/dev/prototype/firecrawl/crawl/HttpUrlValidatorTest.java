package dev.prototype.firecrawl.crawl;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class HttpUrlValidatorTest {
  private final HttpUrlValidator validator = new HttpUrlValidator();

  @ParameterizedTest
  @ValueSource(
      strings = {
        "https://example.test/articles",
        "http://example.test:8080/a?category=synthetic",
        "HTTPS://EXAMPLE.test/",
        "https://example.test:65535/"
      })
  void acceptsWellFormedHttpUrlsWithoutAccessingThem(String url) {
    assertThat(validator.isValid(url, null)).isTrue();
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "file:///etc/passwd",
        "javascript:alert(1)",
        "/relative",
        "https://",
        "https://bad host.test/",
        "https://user:password@example.test/",
        "https://user@example.test/",
        "https://example.test/#fragment",
        "https://example.test/#",
        "https://example.test:0/",
        "https://example.test:65536/",
        "https://example.test:abc/",
        "https://example.test/%",
        " https://example.test/"
      })
  void rejectsInvalidOrCredentialBearingUrls(String url) {
    assertThat(validator.isValid(url, null)).isFalse();
  }
}
