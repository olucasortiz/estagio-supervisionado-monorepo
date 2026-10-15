package com.lionfitness.backend.common.api;

public final class PaginationUtils {

    public static final int DEFAULT_PAGE = 0;
    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    private PaginationUtils() {
    }

    public static int validateAndGetPage(Integer page) {
        if (page == null) {
            return DEFAULT_PAGE;
        }
        if (page < 0) {
            throw new IllegalArgumentException("O parâmetro 'page' não pode ser negativo.");
        }
        return page;
    }

    public static int validateAndGetSize(Integer size) {
        if (size == null) {
            return DEFAULT_SIZE;
        }
        if (size < 1 || size > MAX_SIZE) {
            throw new IllegalArgumentException("O parâmetro 'size' deve estar entre 1 e " + MAX_SIZE + ".");
        }
        return size;
    }

    public static int calculateOffset(int page, int size) {
        return page * size;
    }
}
