package dev.prototype.firecrawl.crawl;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CrawlValidationRequest(
    @NotBlank(message = "A URL is required.")
        @Size(max = 2048, message = "URL must be at most 2048 characters.")
        @ValidHttpUrl
        String url,
    @NotNull(message = "A page budget is required.")
        @Min(value = 1, message = "Page budget must be at least 1.")
        @Max(value = 100, message = "Page budget must be at most 100.")
        Integer maxPages,
    @NotNull(message = "Permission acknowledgment is required.")
        @AssertTrue(message = "Acknowledge that site permission and rules must be checked.")
        Boolean termsAccepted) {}
