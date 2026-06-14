package com.lionfitness.backend.common.exception;

import java.time.Instant;
import java.util.List;

import com.lionfitness.backend.auth.exception.AuthUserNotFoundException;
import com.lionfitness.backend.auth.exception.InactiveUserException;
import com.lionfitness.backend.auth.exception.InvalidCredentialsException;
import com.lionfitness.backend.cancellationrecord.exception.CancellationBlockedException;
import com.lionfitness.backend.cancellationrecord.exception.CancellationRecordNotFoundException;
import com.lionfitness.backend.common.api.ApiErrorResponse;
import com.lionfitness.backend.common.api.ApiValidationError;
import com.lionfitness.backend.member.exception.DuplicateCpfException;
import com.lionfitness.backend.member.exception.MemberNotFoundException;
import com.lionfitness.backend.payment.exception.InvalidPaymentAmountException;
import com.lionfitness.backend.payment.exception.PaymentNotFoundException;
import com.lionfitness.backend.payment.exception.PaymentSubscriptionNotFoundException;
import com.lionfitness.backend.personaltrainer.exception.DuplicatePersonalTrainerCpfException;
import com.lionfitness.backend.personaltrainer.exception.PersonalTrainerNotFoundException;
import com.lionfitness.backend.plan.exception.PlanNotFoundException;
import com.lionfitness.backend.subscription.exception.InvalidSubscriptionPeriodException;
import com.lionfitness.backend.subscription.exception.SubscriptionMemberNotFoundException;
import com.lionfitness.backend.subscription.exception.SubscriptionNotFoundException;
import com.lionfitness.backend.subscription.exception.SubscriptionPlanNotFoundException;
import com.lionfitness.backend.user.exception.DuplicateEmailException;
import com.lionfitness.backend.user.exception.UserNotFoundException;
import com.lionfitness.backend.workout.exception.WorkoutNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(PlanNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handlePlanNotFoundException(
            PlanNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(MemberNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleMemberNotFoundException(
            MemberNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleUserNotFoundException(
            UserNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(AuthUserNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleAuthUserNotFoundException(
            AuthUserNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidCredentialsException(
            InvalidCredentialsException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.UNAUTHORIZED,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(InactiveUserException.class)
    public ResponseEntity<ApiErrorResponse> handleInactiveUserException(
            InactiveUserException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.FORBIDDEN,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(PersonalTrainerNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handlePersonalTrainerNotFoundException(
            PersonalTrainerNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(SubscriptionNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleSubscriptionNotFoundException(
            SubscriptionNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(PaymentNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handlePaymentNotFoundException(
            PaymentNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(WorkoutNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleWorkoutNotFoundException(
            WorkoutNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(CancellationRecordNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleCancellationRecordNotFoundException(
            CancellationRecordNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, org.springframework.validation.BindException.class})
    public ResponseEntity<ApiErrorResponse> handleValidationException(
            Exception exception,
            HttpServletRequest request
    ) {
        org.springframework.validation.BindingResult bindingResult;
        if (exception instanceof MethodArgumentNotValidException ex) {
            bindingResult = ex.getBindingResult();
        } else if (exception instanceof org.springframework.validation.BindException ex) {
            bindingResult = ex.getBindingResult();
        } else {
            bindingResult = null;
        }

        List<ApiValidationError> validationErrors = List.of();
        if (bindingResult != null) {
            validationErrors = bindingResult.getFieldErrors()
                    .stream()
                    .map(this::toValidationError)
                    .toList();
        }

        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.BAD_REQUEST,
                "Verifique os campos informados.",
                request.getRequestURI(),
                validationErrors
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolationException(
            jakarta.validation.ConstraintViolationException exception,
            HttpServletRequest request
    ) {
        List<ApiValidationError> validationErrors = exception.getConstraintViolations()
                .stream()
                .map(violation -> {
                    String path = violation.getPropertyPath().toString();
                    String fieldName = path;
                    int lastDot = path.lastIndexOf('.');
                    if (lastDot != -1) {
                        fieldName = path.substring(lastDot + 1);
                    }
                    return new ApiValidationError(fieldName, violation.getMessage());
                })
                .toList();

        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.BAD_REQUEST,
                "Verifique os campos informados.",
                request.getRequestURI(),
                validationErrors
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParams(
            org.springframework.web.bind.MissingServletRequestParameterException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.BAD_REQUEST,
                "Parâmetro obrigatório ausente: " + exception.getParameterName() + ".",
                request.getRequestURI(),
                List.of()
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(org.springframework.web.multipart.MultipartException.class)
    public ResponseEntity<ApiErrorResponse> handleMultipartException(
            org.springframework.web.multipart.MultipartException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.BAD_REQUEST,
                "Erro no envio do arquivo: " + exception.getMessage() + ".",
                request.getRequestURI(),
                List.of()
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatchException(
            MethodArgumentTypeMismatchException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.BAD_REQUEST,
                "Invalid request parameter",
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(DuplicateCpfException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateCpfException(
            DuplicateCpfException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.CONFLICT,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateEmailException(
            DuplicateEmailException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.CONFLICT,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(DuplicatePersonalTrainerCpfException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicatePersonalTrainerCpfException(
            DuplicatePersonalTrainerCpfException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.CONFLICT,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(CancellationBlockedException.class)
    public ResponseEntity<ApiErrorResponse> handleCancellationBlockedException(
            CancellationBlockedException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.CONFLICT,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler({
            InvalidSubscriptionPeriodException.class,
            SubscriptionMemberNotFoundException.class,
            SubscriptionPlanNotFoundException.class,
            InvalidPaymentAmountException.class,
            IllegalArgumentException.class
    })
    public ResponseEntity<ApiErrorResponse> handleBadRequestExceptions(
            RuntimeException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.BAD_REQUEST,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(PaymentSubscriptionNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handlePaymentSubscriptionNotFoundException(
            PaymentSubscriptionNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage(),
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    // Handlers específicos de erros de banco — devem vir antes do DataAccessException genérico

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateKeyException(
            DuplicateKeyException exception,
            HttpServletRequest request
    ) {
        logger.warn("Duplicate key violation on {}: {}", request.getRequestURI(), exception.getMessage());

        // Tenta identificar duplicidade de email pelo nome da constraint
        String msg = exception.getMessage() != null ? exception.getMessage().toLowerCase() : "";
        String userMessage = msg.contains("email") || msg.contains("users_email_key")
                ? "Já existe um usuário cadastrado com este email."
                : "Já existe um registro com essas informações.";

        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.CONFLICT,
                userMessage,
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolationException(
            DataIntegrityViolationException exception,
            HttpServletRequest request
    ) {
        logger.warn("Data integrity violation on {}: {}", request.getRequestURI(), exception.getMessage());

        String msg = exception.getMessage() != null ? exception.getMessage().toLowerCase() : "";
        String userMessage;

        if (msg.contains("email") || msg.contains("users_email_key")) {
            userMessage = "Já existe um usuário cadastrado com este email.";
        } else if (msg.contains("cpf")) {
            userMessage = "Já existe um cadastro com este CPF.";
        } else if (msg.contains("foreign key") || msg.contains("fk_")) {
            userMessage = "Operação não permitida: este registro está vinculado a outros dados.";
        } else {
            userMessage = "Violação de integridade de dados. Verifique as informações e tente novamente.";
        }

        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.CONFLICT,
                userMessage,
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(BadSqlGrammarException.class)
    public ResponseEntity<ApiErrorResponse> handleBadSqlGrammarException(
            BadSqlGrammarException exception,
            HttpServletRequest request
    ) {
        logger.error("SQL grammar error on {}: {}", request.getRequestURI(), exception.getMessage(), exception);

        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Erro interno de configuração do banco de dados.",
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiErrorResponse> handleDataAccessException(
            DataAccessException exception,
            HttpServletRequest request
    ) {
        logger.error("Database operation failed on {}", request.getRequestURI(), exception);

        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Erro interno ao processar a operação.",
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResourceFoundException(
            org.springframework.web.servlet.resource.NoResourceFoundException exception,
            HttpServletRequest request
    ) {
        logger.warn("Resource not found on {}: {}", request.getRequestURI(), exception.getMessage());

        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.NOT_FOUND,
                "Resource not found",
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatusException(
            ResponseStatusException exception,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        ApiErrorResponse response = buildErrorResponse(
                status,
                exception.getReason() != null ? exception.getReason() : "Request failed",
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(status).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGenericException(
            Exception exception,
            HttpServletRequest request
    ) {
        logger.error("Unexpected error on {}", request.getRequestURI(), exception);

        ApiErrorResponse response = buildErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Ocorreu um erro inesperado.",
                request.getRequestURI(),
                List.of()
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    private ApiValidationError toValidationError(FieldError fieldError) {
        return new ApiValidationError(fieldError.getField(), fieldError.getDefaultMessage());
    }

    private ApiErrorResponse buildErrorResponse(
            HttpStatus status,
            String message,
            String path,
            List<ApiValidationError> validationErrors
    ) {
        return new ApiErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                path,
                validationErrors
        );
    }
}
