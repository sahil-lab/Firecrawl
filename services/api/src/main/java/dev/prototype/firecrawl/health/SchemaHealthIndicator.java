package dev.prototype.firecrawl.health;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component("schema")
public class SchemaHealthIndicator implements HealthIndicator {
  private static final Logger LOGGER = LoggerFactory.getLogger(SchemaHealthIndicator.class);
  private final JdbcTemplate jdbc;

  public SchemaHealthIndicator(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public Health health() {
    try {
      String version =
          jdbc.queryForObject(
              "SELECT value FROM platform_metadata WHERE name = 'schema_version'", String.class);
      if (!"1".equals(version)) {
        LOGGER.warn("Schema readiness check reported an unexpected schema version.");
        return Health.down().build();
      }
      return Health.up().build();
    } catch (DataAccessException exception) {
      LOGGER.warn("Schema readiness check failed ({}).", exception.getClass().getSimpleName());
      return Health.down().build();
    }
  }
}
