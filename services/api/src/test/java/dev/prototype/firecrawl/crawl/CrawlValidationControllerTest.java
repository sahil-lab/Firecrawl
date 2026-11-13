package dev.prototype.firecrawl.crawl;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CrawlValidationController.class)
class CrawlValidationControllerTest {
  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper mapper;

  @Test
  void validatesSyntheticRequestWithoutEnablingExecution() throws Exception {
    mvc.perform(
            post("/crawl-jobs/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"url":"https://example.test/articles","maxPages":10,"termsAccepted":true}
                    """))
        .andExpect(status().isOk())
        .andExpect(content().json("{\"valid\":true,\"executionEnabled\":false}"));
  }

  @ParameterizedTest
  @ValueSource(ints = {1, 100})
  void acceptsPageBudgetBoundaries(int maxPages) throws Exception {
    mvc.perform(
            post("/crawl-jobs/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mapper.writeValueAsString(
                        Map.of(
                            "url",
                            "https://example.test/",
                            "maxPages",
                            maxPages,
                            "termsAccepted",
                            true))))
        .andExpect(status().isOk());
  }

  @ParameterizedTest
  @ValueSource(ints = {-1, 0, 101})
  void rejectsPageBudgetOutsideBoundaries(int maxPages) throws Exception {
    mvc.perform(
            post("/crawl-jobs/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mapper.writeValueAsString(
                        Map.of(
                            "url",
                            "https://example.test/",
                            "maxPages",
                            maxPages,
                            "termsAccepted",
                            true))))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.errors.maxPages").isArray());
  }

  @Test
  void rejectsAllMissingFields() throws Exception {
    mvc.perform(post("/crawl-jobs/validate").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.url").isArray())
        .andExpect(jsonPath("$.errors.maxPages").isArray())
        .andExpect(jsonPath("$.errors.termsAccepted").isArray());
  }

  @Test
  void requiresPermissionAcknowledgment() throws Exception {
    mvc.perform(
            post("/crawl-jobs/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"url":"https://example.test/","maxPages":10,"termsAccepted":false}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.termsAccepted").isArray());
  }

  @Test
  void rejectsLongUrls() throws Exception {
    mvc.perform(
            post("/crawl-jobs/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    mapper.writeValueAsString(
                        Map.of(
                            "url",
                            "https://example.test/" + "a".repeat(2048),
                            "maxPages",
                            10,
                            "termsAccepted",
                            true))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.url").isArray());
  }

  @Test
  void doesNotEchoCredentialsInValidationErrors() throws Exception {
    mvc.perform(
            post("/crawl-jobs/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"url":"https://synthetic:do-not-echo@example.test/","maxPages":10,"termsAccepted":true}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.url").isArray())
        .andExpect(content().string(not(containsString("do-not-echo"))));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{",
        "null",
        "[]",
        "{\"url\":123,\"maxPages\":10,\"termsAccepted\":true}",
        "{\"url\":1.5,\"maxPages\":10,\"termsAccepted\":true}",
        "{\"url\":true,\"maxPages\":10,\"termsAccepted\":true}",
        "{\"url\":\"https://example.test/\",\"maxPages\":\"10\",\"termsAccepted\":true}",
        "{\"url\":\"https://example.test/\",\"maxPages\":1.5,\"termsAccepted\":true}",
        "{\"url\":\"https://example.test/\",\"maxPages\":10,\"termsAccepted\":\"true\"}",
        "{\"url\":\"https://example.test/\",\"maxPages\":10,\"termsAccepted\":true,\"unknown\":\"do-not-echo\"}"
      })
  void rejectsMalformedUnknownAndCoercedInput(String body) throws Exception {
    mvc.perform(post("/crawl-jobs/validate").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Malformed request"))
        .andExpect(content().string(not(containsString("do-not-echo"))));
  }

  @Test
  void rejectsUnsupportedMediaType() throws Exception {
    mvc.perform(post("/crawl-jobs/validate").contentType(MediaType.TEXT_PLAIN).content("not json"))
        .andExpect(status().isUnsupportedMediaType());
  }
}
