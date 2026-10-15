package com.lionfitness.backend.common.validation;

import com.lionfitness.backend.common.exception.GlobalExceptionHandler;
import com.lionfitness.backend.member.controller.MemberController;
import com.lionfitness.backend.member.dto.MemberCreateRequest;
import com.lionfitness.backend.member.dto.MemberUpdateRequest;
import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.member.service.MemberService;
import com.lionfitness.backend.personaltrainer.controller.PersonalTrainerController;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerUpdateRequest;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.personaltrainer.service.PersonalTrainerService;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.user.service.UserService;
import com.lionfitness.backend.workout.repository.WorkoutRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CpfValidationTest {
    MemberRepository memberRepo;
    PersonalTrainerRepository trainerRepo;
    UserRepository userRepo;
    UserService users;
    MemberService members;
    PersonalTrainerService trainers;
    MockMvc mvc;
    LocalValidatorFactoryBean validator;
    UUID id=UUID.randomUUID(), userId=UUID.randomUUID();

    @BeforeEach void setup() {
        memberRepo=mock(MemberRepository.class); trainerRepo=mock(PersonalTrainerRepository.class);
        userRepo=mock(UserRepository.class); users=mock(UserService.class);
        members=new MemberService(memberRepo,null,null,null,userRepo,mock(PasswordEncoder.class),mock(WorkoutRepository.class),users,trainerRepo);
        trainers=new PersonalTrainerService(trainerRepo,users,members,userRepo);
        validator=new LocalValidatorFactoryBean(); validator.afterPropertiesSet();
        mvc=MockMvcBuilders.standaloneSetup(new MemberController(members,userRepo,validator),new PersonalTrainerController(trainers,validator))
            .setControllerAdvice(new GlobalExceptionHandler()).setValidator(validator).build();
    }
    @AfterEach void close() { validator.close(); }

    @ParameterizedTest @ValueSource(strings={"00000000000","11111111111","22222222222","33333333333","44444444444","55555555555","66666666666","77777777777","88888888888","99999999999","52998224724","52998224715","123","529982247250","529a98224725",""})
    void rejectsInvalidCpf(String cpf) { assertThat(CpfValidator.isValid(cpf)).isFalse(); }
    @ParameterizedTest @ValueSource(strings={"52998224725","529.982.247-25","11144477735","98765432100"," 529.982.247-25 "})
    void acceptsMathematicallyValidCpfAndMasks(String cpf) { assertThat(CpfValidator.isValid(cpf)).isTrue(); }
    @Test void rejectsNull() { assertThat(CpfValidator.isValid(null)).isFalse(); }

    @ParameterizedTest @ValueSource(strings={"/members","/personal-trainers"})
    void invalidJsonReturnsStandard400WithoutCreatingUsers(String path) throws Exception {
        mvc.perform(post(path).contentType("application/json").content(json("00000000000")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("status").value(400)).andExpect(jsonPath("path").value(path));
        verifyNoInteractions(users,userRepo,memberRepo,trainerRepo);
    }
    @ParameterizedTest @ValueSource(strings={"/members","/personal-trainers"})
    void invalidMultipartReturnsStandard400WithoutCreatingUsers(String path) throws Exception {
        mvc.perform(multipart(path).file(new MockMultipartFile("photo","photo.png","image/png",new byte[]{1}))
            .param("name","Teste").param("cpf","111.111.111-11").param("email","test@lion.local")
            .param("birthDate","2000-01-01").param("phone","11999999999").param("specialty","Musculação"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("status").value(400)).andExpect(jsonPath("path").value(path));
        verifyNoInteractions(users,userRepo,memberRepo,trainerRepo);
    }
    void validPersistence() {
        var member=new Member(id,userId,null,"Teste","52998224725","test@lion.local",LocalDate.of(2000,1,1),null,true,LocalDateTime.now());
        when(memberRepo.save(any(),any(),any())).thenReturn(member);
        when(memberRepo.findActiveById(id)).thenReturn(Optional.of(member));
        var trainer=new PersonalTrainer(id,userId,"Teste","52998224725","test@lion.local","11999999999","Musculação",true,LocalDateTime.now(),null);
        when(trainerRepo.save(any(),any(),any())).thenReturn(trainer);
        when(trainerRepo.findActiveById(id)).thenReturn(Optional.of(trainer));
        when(users.create(any())).thenReturn(new User(userId,"Teste","test@lion.local","hash","PERSONAL_TRAINER",true,LocalDateTime.now(),false));
    }
    @ParameterizedTest @ValueSource(strings={"/members","/personal-trainers"})
    void validMaskedJsonIsNormalizedAndCreated(String path) throws Exception {
        validPersistence();
        mvc.perform(post(path).contentType("application/json").content(json("529.982.247-25")))
            .andExpect(status().isCreated()).andExpect(jsonPath("cpf").value("52998224725"));
        if (path.equals("/members")) verify(memberRepo).save(any(),argThat(r -> r.cpf().equals("52998224725")),any());
        else verify(trainerRepo).save(any(),argThat(r -> r.cpf().equals("52998224725")),any());
    }
    @ParameterizedTest @ValueSource(strings={"/members","/personal-trainers"})
    void validMaskedMultipartWithPhotoIsCreated(String path) throws Exception {
        validPersistence();
        mvc.perform(multipart(path).file(new MockMultipartFile("photo","photo.png","image/png",new byte[]{1}))
            .param("name","Teste").param("cpf","529.982.247-25").param("email","test@lion.local")
            .param("birthDate","2000-01-01").param("phone","11999999999").param("specialty","Musculação"))
            .andExpect(status().isCreated()).andExpect(jsonPath("cpf").value("52998224725"));
        verify(users).saveUserPhoto(eq(userId),any());
    }
    @Test void unchangedLegacyMemberCpfCanBeEditedButNewInvalidCpfCannot() {
        var legacy=new Member(id,userId,null,"Legado","12345678901","legacy@lion.local",LocalDate.of(2000,1,1),null,true,LocalDateTime.now());
        when(memberRepo.findActiveById(id)).thenReturn(Optional.of(legacy));
        var unchanged=new MemberUpdateRequest("Editado","12345678901",LocalDate.of(2000,1,1),null,null);
        members.update(id,unchanged);
        verify(memberRepo).update(id,unchanged);
        assertThatThrownBy(() -> members.updateWithPhoto(id,new MemberUpdateRequest("Editado","00000000000",LocalDate.of(2000,1,1),null,null),null))
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
    @Test void unchangedLegacyTrainerCpfCanBeEditedButNewInvalidCpfCannot() {
        var legacy=new PersonalTrainer(id,userId,"Legado","12345678901","legacy@lion.local","11999999999","Treino",true,LocalDateTime.now(),null);
        when(trainerRepo.findActiveById(id)).thenReturn(Optional.of(legacy));
        var unchanged=new PersonalTrainerUpdateRequest("Editado","12345678901","legacy@lion.local","11999999999","Treino");
        trainers.update(id,unchanged);
        verify(trainerRepo).update(id,unchanged);
        assertThatThrownBy(() -> trainers.update(id,new PersonalTrainerUpdateRequest("Editado","00000000000","legacy@lion.local","11999999999","Treino")))
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
    String json(String cpf) {
        return "{\"name\":\"Teste\",\"cpf\":\""+cpf+"\",\"email\":\"test@lion.local\",\"birthDate\":\"2000-01-01\",\"phone\":\"11999999999\",\"specialty\":\"Musculação\"}";
    }
}
