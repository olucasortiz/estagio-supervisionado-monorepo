package com.lionfitness.backend.payment.service;

import java.util.List;

import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.payment.dto.MyPaymentResponse;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Estória 17: o aluno consulta somente os próprios pagamentos, sem poder alterá-los. */
@Service
public class MyPaymentHistoryService {

    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final PaymentRepository paymentRepository;

    public MyPaymentHistoryService(UserRepository userRepository, MemberRepository memberRepository,
                                   PaymentRepository paymentRepository) {
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.paymentRepository = paymentRepository;
    }

    public List<MyPaymentResponse> findMine(String email) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        return memberRepository.findByUserId(user.id())
                .map(member -> paymentRepository.findHistoryByMemberId(member.id()))
                .orElse(List.of());
    }
}
