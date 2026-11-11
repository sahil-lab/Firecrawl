package dev.prototype.firecrawl.crawl;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = HttpUrlValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidHttpUrl {
  String message() default
      "Use an absolute HTTP(S) URL with a hostname, valid port, and no credentials or fragment.";

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
