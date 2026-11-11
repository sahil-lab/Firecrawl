package dev.prototype.firecrawl.health;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Status;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

class SchemaHealthIndicatorTest {
  private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
  private final SchemaHealthIndicator indicator = new SchemaHealthIndicator(jdbc);

  @Test
  void requiresExpectedMigrationMarker() {
    when(jdbc.queryForObject(anyString(), eq(String.class))).thenReturn("1");
    assertThat(indicator.health().getStatus()).isEqualTo(Status.UP);
  }

  @Test
  void rejectsAnUnexpectedVersion() {
    when(jdbc.queryForObject(anyString(), eq(String.class))).thenReturn("2");
    assertThat(indicator.health().getStatus()).isEqualTo(Status.DOWN);
  }

  @Test
  void rejectsMissingMetadata() {
    when(jdbc.queryForObject(anyString(), eq(String.class))).thenReturn(null);
    assertThat(indicator.health().getStatus()).isEqualTo(Status.DOWN);
  }

  @Test
  void reportsDatabaseFailureInsteadOfSuccess() {
    when(jdbc.queryForObject(anyString(), eq(String.class)))
        .thenThrow(new DataAccessResourceFailureException("Synthetic unavailable database"));
    assertThat(indicator.health().getStatus()).isEqualTo(Status.DOWN);
    assertThat(indicator.health().getDetails()).isEmpty();
  }
}
