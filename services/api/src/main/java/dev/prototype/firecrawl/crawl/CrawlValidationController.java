package dev.prototype.firecrawl.crawl;

import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/crawl-jobs")
public class CrawlValidationController {
  @PostMapping(
      value = "/validate",
      consumes = MediaType.APPLICATION_JSON_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE)
  public CrawlValidationResponse validate(@Valid @RequestBody CrawlValidationRequest request) {
    return new CrawlValidationResponse(true, false);
  }
}
